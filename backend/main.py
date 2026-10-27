import os
import io
import re
import urllib.parse
import time
import uuid
import zipfile
import base64
import shutil
import asyncio
import threading
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel
import pymupdf

from pdf_processor import PDFProcessor
from sample_generator import create_sample_tracxn_pdf
from supabase_service import supabase_service

app = FastAPI(
    title="PDF Disclaimer Cleaner API",
    description="Backend API for detecting and cleanly removing Tracxn disclaimers from financial reports",
    version="1.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.environ.get("STORAGE_DIR", os.path.join(BASE_DIR, "storage"))
try:
    os.makedirs(TEMP_DIR, exist_ok=True)
except (PermissionError, OSError):
    TEMP_DIR = "/tmp/storage"

UPLOAD_DIR = os.path.join(TEMP_DIR, "uploads")
PROCESSED_DIR = os.path.join(TEMP_DIR, "processed")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

processor = PDFProcessor()

# In-memory session registry for tracking files and processing state
files_db: Dict[str, Dict[str, Any]] = {}
# Active cancellation events mapping file_id -> threading.Event
cancellation_events: Dict[str, threading.Event] = {}


def format_size(size_bytes: int) -> str:
    """Formats bytes into human readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


def cleanup_old_files():
    """Removes files older than 1 hour for data privacy and storage safety."""
    now = time.time()
    for directory in [UPLOAD_DIR, PROCESSED_DIR]:
        if not os.path.exists(directory):
            continue
        for fname in os.listdir(directory):
            fpath = os.path.join(directory, fname)
            try:
                if os.path.isfile(fpath) and (now - os.path.getmtime(fpath) > 3600):
                    os.remove(fpath)
            except Exception:
                pass


def _bg_upload_raw_to_supabase(file_id: str, safe_filename: str, content: bytes, record: Dict[str, Any]):
    if not supabase_service.is_enabled:
        return
    try:
        raw_storage_path = f"{file_id}/{safe_filename}"
        supabase_service.upload_pdf_bytes("raw-pdfs", raw_storage_path, content)
        supabase_service.upsert_file_record(record)
    except Exception as e:
        print(f"[Supabase] Background raw upload error for {file_id}: {e}")


def _bg_sync_completed_to_supabase(file_id: str, output_path: str, output_filename: str, record: Dict[str, Any]):
    if not supabase_service.is_enabled:
        return
    try:
        cleaned_storage_path = None
        if os.path.exists(output_path):
            with open(output_path, "rb") as f:
                cleaned_bytes = f.read()
            cleaned_storage_path = f"{file_id}/{output_filename}"
            supabase_service.upload_pdf_bytes("cleaned-pdfs", cleaned_storage_path, cleaned_bytes)
            record["cleaned_storage_path"] = cleaned_storage_path
            if file_id in files_db:
                files_db[file_id]["cleaned_storage_path"] = cleaned_storage_path
        supabase_service.upsert_file_record(record)
    except Exception as e:
        print(f"[Supabase] Background completion sync error for {file_id}: {e}")


@app.on_event("startup")
async def startup_event():
    cleanup_old_files()
    if supabase_service.is_enabled:
        def _hydrate():
            try:
                db_records = supabase_service.list_all_files()
                if db_records:
                    for item in db_records:
                        fid = str(item["id"])
                        if fid not in files_db:
                            files_db[fid] = item
            except Exception as e:
                print(f"[Supabase] Startup hydration error: {e}")
        threading.Thread(target=_hydrate, daemon=True).start()


@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "PDF Disclaimer Cleaner API",
        "version": "1.0.0"
    }


@app.post("/api/upload")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    """
    Accepts one or multiple PDF uploads.
    Validates PDF format and encryption, extracts metadata.
    Returns immediately without blocking on external networks.
    """
    cleanup_old_files()
    uploaded_records = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"File '{file.filename}' is not a PDF.")

        file_id = str(uuid.uuid4())
        safe_filename = os.path.basename(file.filename)
        upload_path = os.path.join(UPLOAD_DIR, f"{file_id}_{safe_filename}")

        # Save to disk
        content = await file.read()
        with open(upload_path, "wb") as f:
            f.write(content)

        file_size = len(content)

        # Validate PDF structure and password encryption
        try:
            doc = pymupdf.open(upload_path)
            if doc.is_encrypted:
                doc.close()
                os.remove(upload_path)
                return JSONResponse(
                    status_code=400,
                    content={"error": f"'{safe_filename}' is password-protected. Please remove password encryption first."}
                )
            doc_info = processor.analyze_document_structure(doc)
            page_count = len(doc)
            doc.close()
        except Exception as e:
            if os.path.exists(upload_path):
                os.remove(upload_path)
            return JSONResponse(
                status_code=400,
                content={"error": f"Failed to parse '{safe_filename}'. Document may be corrupted."}
            )

        raw_storage_path = f"{file_id}/{safe_filename}" if supabase_service.is_enabled else None

        record = {
            "id": file_id,
            "filename": safe_filename,
            "processed_filename": safe_filename.rsplit(".", 1)[0] + "_cleaned.pdf",
            "size": file_size,
            "formatted_size": format_size(file_size),
            "page_count": page_count,
            "document_type": doc_info["document_type"],
            "document_type_label": doc_info["document_type_label"],
            "has_selectable_text": doc_info["has_selectable_text"],
            "has_scanned_images": doc_info["has_scanned_images"],
            "text_pages_count": doc_info["text_pages_count"],
            "scanned_pages_count": doc_info["scanned_pages_count"],
            "mixed_pages_count": doc_info["mixed_pages_count"],
            "upload_path": upload_path,
            "raw_storage_path": raw_storage_path,
            "processed_path": None,
            "cleaned_storage_path": None,
            "status": "READY",  # READY, PROCESSING, SUCCESS, NO_MATCH, NEEDS_REVIEW, VALIDATION_FAILED, FAILED
            "progress": 0,
            "pages_scanned": 0,
            "disclaimers_removed": 0,
            "disclaimers_found": 0,
            "needs_review_count": 0,
            "pages_with_disclaimer": [],
            "validation": None,
            "page_details": [],
            "error_message": None,
            "created_at": time.time()
        }
        files_db[file_id] = record
        uploaded_records.append(record)

        if supabase_service.is_enabled:
            threading.Thread(
                target=_bg_upload_raw_to_supabase,
                args=(file_id, safe_filename, content, record.copy()),
                daemon=True
            ).start()

    return {"files": uploaded_records}


@app.post("/api/generate-sample")
def generate_sample_report():
    """
    Generates a realistic sample financial statement PDF with Tracxn disclaimers
    so users can immediately experience and test the cleaner.
    """
    file_id = str(uuid.uuid4())
    filename = "Tracxn_Ultra_Gas_Financial_Statements_Sample.pdf"
    upload_path = os.path.join(UPLOAD_DIR, f"{file_id}_{filename}")
    
    create_sample_tracxn_pdf(upload_path, pages=3)
    file_size = os.path.getsize(upload_path)

    doc = pymupdf.open(upload_path)
    page_count = len(doc)
    doc_info = processor.analyze_document_structure(doc)
    doc.close()

    raw_storage_path = f"{file_id}/{filename}" if supabase_service.is_enabled else None
    record = {
        "id": file_id,
        "filename": filename,
        "processed_filename": filename.rsplit(".", 1)[0] + "_cleaned.pdf",
        "size": file_size,
        "formatted_size": format_size(file_size),
        "page_count": page_count,
        "document_type": doc_info["document_type"],
        "document_type_label": doc_info["document_type_label"],
        "has_selectable_text": doc_info["has_selectable_text"],
        "has_scanned_images": doc_info["has_scanned_images"],
        "text_pages_count": doc_info["text_pages_count"],
        "scanned_pages_count": doc_info["scanned_pages_count"],
        "mixed_pages_count": doc_info["mixed_pages_count"],
        "upload_path": upload_path,
        "raw_storage_path": raw_storage_path,
        "processed_path": None,
        "cleaned_storage_path": None,
        "status": "READY",
        "progress": 0,
        "pages_scanned": 0,
        "disclaimers_removed": 0,
        "disclaimers_found": 0,
        "needs_review_count": 0,
        "pages_with_disclaimer": [],
        "validation": None,
        "page_details": [],
        "error_message": None,
        "created_at": time.time()
    }
    files_db[file_id] = record

    if supabase_service.is_enabled:
        with open(upload_path, "rb") as f:
            sample_bytes = f.read()
        threading.Thread(
            target=_bg_upload_raw_to_supabase,
            args=(file_id, filename, sample_bytes, record.copy()),
            daemon=True
        ).start()

    return {"file": record}


def execute_pdf_processing(file_id: str):
    """Worker function to process single PDF with real-time progress and cancellation support."""
    record = files_db.get(file_id)
    if not record:
        return

    # Check if cancellation was requested before worker picked up task
    if record.get("status") == "CANCELLATION_REQUESTED":
        record["status"] = "CANCELLED"
        record["error_message"] = "Conversion cancelled."
        return

    cancel_event = threading.Event()
    cancellation_events[file_id] = cancel_event

    record["status"] = "PROCESSING"
    record["progress"] = 5
    record["pages_scanned"] = 0
    record["error_message"] = None

    try:
        input_path = record.get("upload_path")
        # If upload_path not present or file not found on disk, try restoring from Supabase storage
        if not input_path or not os.path.exists(input_path):
            raw_path = record.get("raw_storage_path")
            if raw_path and supabase_service.is_enabled:
                input_path = os.path.join(UPLOAD_DIR, f"{file_id}_{record['filename']}")
                data = supabase_service.download_pdf_bytes("raw-pdfs", raw_path)
                if data:
                    with open(input_path, "wb") as f:
                        f.write(data)
                    record["upload_path"] = input_path

        if not input_path or not os.path.exists(input_path):
            raise FileNotFoundError(f"Source file '{record.get('filename')}' was not found on local disk or cloud storage.")

        output_filename = record.get("processed_filename") or (record["filename"].rsplit(".", 1)[0] + "_cleaned.pdf")
        record["processed_filename"] = output_filename
        output_path = os.path.join(PROCESSED_DIR, f"{file_id}_{output_filename}")

        def on_progress(current, total):
            # Scale progress across 10% to 92%
            pct = int((current / total) * 82) + 10
            record["progress"] = min(92, pct)
            record["pages_scanned"] = current

        result = processor.process_pdf(
            input_path, 
            output_path, 
            progress_callback=on_progress,
            cancel_check=cancel_event.is_set
        )

        # Handle cancellation triggered during processing
        if result.get("status") == "CANCELLED" or cancel_event.is_set():
            record["status"] = "CANCELLED"
            record["error_message"] = "Conversion cancelled."
            if supabase_service.is_enabled:
                threading.Thread(
                    target=lambda: supabase_service.update_file_record(file_id, {
                        "status": "CANCELLED",
                        "error_message": "Conversion cancelled."
                    }),
                    daemon=True
                ).start()
            return

        record["processed_path"] = output_path
        record["status"] = result["status"]
        record["progress"] = 100
        record["pages_scanned"] = result["pages_scanned"]
        record["disclaimers_found"] = result["disclaimers_found"]
        record["disclaimers_removed"] = result["disclaimers_removed"]
        record["needs_review_count"] = result["needs_review_count"]
        record["pages_with_disclaimer"] = result["pages_with_disclaimer"]
        record["validation"] = result["validation"]
        record["page_details"] = result["page_details"]
        if "document_info" in result:
            record["document_type"] = result["document_info"]["document_type"]
            record["document_type_label"] = result["document_info"]["document_type_label"]
            record["has_selectable_text"] = result["document_info"]["has_selectable_text"]
            record["has_scanned_images"] = result["document_info"]["has_scanned_images"]
            record["text_pages_count"] = result["document_info"]["text_pages_count"]
            record["scanned_pages_count"] = result["document_info"]["scanned_pages_count"]
            record["mixed_pages_count"] = result["document_info"]["mixed_pages_count"]

        # Ensure actionable error message if validation failed
        if result["status"] == "VALIDATION_FAILED":
            issues_str = "; ".join(result["validation"].get("issues", []))
            record["error_message"] = f"Validation discrepancy detected: {issues_str}. Original file preserved."
        elif result["status"] in ("SUCCESS", "NO_MATCH", "NEEDS_REVIEW"):
            record["error_message"] = None

        # Verify that output file actually exists and is non-empty
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            shutil.copyfile(input_path, output_path)

        if supabase_service.is_enabled:
            threading.Thread(
                target=_bg_sync_completed_to_supabase,
                args=(file_id, output_path, output_filename, record.copy()),
                daemon=True
            ).start()

    except Exception as e:
        if cancel_event.is_set():
            record["status"] = "CANCELLED"
            record["error_message"] = "Conversion cancelled."
        else:
            record["status"] = "FAILED"
            record["progress"] = 100
            record["error_message"] = f"Processing error: {str(e)}"
            if supabase_service.is_enabled:
                err_msg = record["error_message"]
                threading.Thread(
                    target=lambda: supabase_service.update_file_record(file_id, {
                        "status": "FAILED",
                        "progress": 100,
                        "error_message": err_msg
                    }),
                    daemon=True
                ).start()
    finally:
        cancellation_events.pop(file_id, None)


@app.post("/api/process/{file_id}")
async def process_file(file_id: str, background_tasks: BackgroundTasks):
    """Processes a single uploaded PDF asynchronously."""
    if file_id not in files_db:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Mark as PROCESSING immediately so UI reflects it on next instant poll
    files_db[file_id]["status"] = "PROCESSING"
    files_db[file_id]["progress"] = 5
    files_db[file_id]["error_message"] = None
    background_tasks.add_task(execute_pdf_processing, file_id)
    return {"message": "Processing started", "file_id": file_id}


@app.post("/api/process-all")
async def process_all_files(background_tasks: BackgroundTasks):
    """Batch processes all uploaded PDFs asynchronously."""
    started_ids = []
    for file_id, record in files_db.items():
        if record["status"] in ("READY", "FAILED", "VALIDATION_FAILED", "CANCELLED"):
            record["status"] = "PROCESSING"
            record["progress"] = 5
            record["error_message"] = None
            background_tasks.add_task(execute_pdf_processing, file_id)
            started_ids.append(file_id)
    
    return {"message": "Batch processing initiated", "files_count": len(started_ids), "file_ids": started_ids}


@app.post("/api/cancel/{file_id}")
async def cancel_file_conversion(file_id: str):
    """
    Cancels an ongoing conversion job for a single file in real-time.
    Immediately signals the processor loop to abort and updates file status.
    """
    if file_id not in files_db:
        raise HTTPException(status_code=404, detail="File not found")

    record = files_db[file_id]
    if record["status"] in ("PROCESSING", "READY"):
        record["status"] = "CANCELLATION_REQUESTED"
        if file_id in cancellation_events:
            cancellation_events[file_id].set()
        else:
            record["status"] = "CANCELLED"
            record["error_message"] = "Conversion cancelled."

        return {
            "message": "Conversion cancellation initiated",
            "file_id": file_id,
            "status": record["status"]
        }

    return {
        "message": f"File is currently in status '{record['status']}'",
        "file_id": file_id,
        "status": record["status"]
    }


@app.post("/api/cancel-all")
async def cancel_all_conversions():
    """Cancels all currently active PDF conversions."""
    cancelled_count = 0
    for file_id, record in files_db.items():
        if record["status"] in ("PROCESSING", "READY", "CANCELLATION_REQUESTED"):
            record["status"] = "CANCELLATION_REQUESTED"
            if file_id in cancellation_events:
                cancellation_events[file_id].set()
            else:
                record["status"] = "CANCELLED"
                record["error_message"] = "Conversion cancelled."
            cancelled_count += 1

    return {
        "message": f"Cancellation requested for {cancelled_count} active conversions",
        "cancelled_count": cancelled_count
    }


def _parse_created_timestamp(val: Any) -> float:
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        try:
            from datetime import datetime
            return datetime.fromisoformat(val.replace("Z", "+00:00")).timestamp()
        except Exception:
            try:
                return float(val)
            except Exception:
                return 0.0
    return 0.0


@app.get("/api/files")
def list_files():
    """Returns list of all files with current state directly from memory (blazing fast)."""
    records = list(files_db.values())
    records.sort(key=lambda r: _parse_created_timestamp(r.get("created_at")), reverse=True)
    return {"files": records}


@app.delete("/api/files/{file_id}")
def delete_single_file(file_id: str):
    """Deletes a single file from memory, disk, and Supabase."""
    record = files_db.pop(file_id, None)
    if supabase_service.is_enabled:
        raw_p = record.get("raw_storage_path") if record else None
        clean_p = record.get("cleaned_storage_path") if record else None
        supabase_service.delete_file_record(file_id, raw_p, clean_p)
    if record:
        for p in [record.get("upload_path"), record.get("processed_path")]:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
    return {"message": f"File {file_id} deleted."}


@app.get("/api/status/{file_id}")
def get_file_status(file_id: str):
    """Returns the status, progress, and QA results of a file."""
    if file_id not in files_db:
        raise HTTPException(status_code=404, detail="File not found")
    return files_db[file_id]


@app.get("/api/preview/{file_id}/{page_num}")
def get_page_preview(file_id: str, page_num: int):
    """
    Renders high-resolution before & after PNG previews of a requested page.
    Returns base64 data URIs and bounding box details.
    """
    if file_id not in files_db:
        raise HTTPException(status_code=404, detail="File not found")
    
    record = files_db[file_id]
    orig_path = record.get("upload_path")
    if not orig_path or not os.path.exists(orig_path):
        raw_p = record.get("raw_storage_path")
        if raw_p and supabase_service.is_enabled:
            orig_path = os.path.join(UPLOAD_DIR, f"{file_id}_{record['filename']}")
            d = supabase_service.download_pdf_bytes("raw-pdfs", raw_p)
            if d:
                with open(orig_path, "wb") as f:
                    f.write(d)
                record["upload_path"] = orig_path

    proc_path = record.get("processed_path")
    if (not proc_path or not os.path.exists(proc_path)) and record.get("cleaned_storage_path") and supabase_service.is_enabled:
        out_fn = record.get("processed_filename") or (record["filename"].rsplit(".", 1)[0] + "_cleaned.pdf")
        proc_path = os.path.join(PROCESSED_DIR, f"{file_id}_{out_fn}")
        d = supabase_service.download_pdf_bytes("cleaned-pdfs", record["cleaned_storage_path"])
        if d:
            with open(proc_path, "wb") as f:
                f.write(d)
            record["processed_path"] = proc_path

    try:
        if not orig_path or not os.path.exists(orig_path):
            raise HTTPException(status_code=404, detail="Original document file not found.")

        # Original page image
        orig_img_bytes = processor.render_page_preview(orig_path, page_num, dpi=130)
        orig_b64 = "data:image/png;base64," + base64.b64encode(orig_img_bytes).decode("ascii")

        # Processed page image (if available, otherwise original)
        if proc_path and os.path.exists(proc_path):
            proc_img_bytes = processor.render_page_preview(proc_path, page_num, dpi=130)
            proc_b64 = "data:image/png;base64," + base64.b64encode(proc_img_bytes).decode("ascii")
        else:
            proc_b64 = orig_b64

        # Page details from record
        page_detail = None
        for p in record.get("page_details", []):
            if p["page_number"] == page_num:
                page_detail = p
                break

        return {
            "page_num": page_num,
            "total_pages": record["page_count"],
            "original_image": orig_b64,
            "processed_image": proc_b64,
            "page_detail": page_detail
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate page preview: {str(e)}")


@app.get("/api/download/{file_id}")
def download_cleaned_pdf(file_id: str):
    """Downloads the cleaned output PDF with explicit PDF content-type and filename headers."""
    if file_id not in files_db:
        raise HTTPException(status_code=404, detail="File not found")
    
    record = files_db[file_id]
    proc_path = record.get("processed_path")
    if (not proc_path or not os.path.exists(proc_path)) and record.get("cleaned_storage_path") and supabase_service.is_enabled:
        out_fn = record.get("processed_filename") or (record["filename"].rsplit(".", 1)[0] + "_cleaned.pdf")
        proc_path = os.path.join(PROCESSED_DIR, f"{file_id}_{out_fn}")
        d = supabase_service.download_pdf_bytes("cleaned-pdfs", record["cleaned_storage_path"])
        if d:
            with open(proc_path, "wb") as f:
                f.write(d)
            record["processed_path"] = proc_path

    if not proc_path or not os.path.exists(proc_path):
        upload_path = record.get("upload_path")
        if upload_path and os.path.exists(upload_path):
            proc_path = upload_path
        else:
            raise HTTPException(status_code=400, detail="Processed file not available.")
    
    raw_filename = record.get("processed_filename") or (record["filename"].rsplit(".", 1)[0] + "_cleaned.pdf")
    if not raw_filename.lower().endswith(".pdf"):
        raw_filename += ".pdf"

    # Generate clean ASCII filename without problematic characters
    ascii_clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', raw_filename)
    while '__' in ascii_clean:
        ascii_clean = ascii_clean.replace('__', '_')
    if not ascii_clean.lower().endswith(".pdf"):
        ascii_clean += ".pdf"

    encoded_filename = urllib.parse.quote(raw_filename)

    headers = {
        "Content-Disposition": f'attachment; filename="{ascii_clean}"; filename*=UTF-8\'\'{encoded_filename}',
        "Content-Type": "application/pdf",
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Type"
    }

    return FileResponse(
        proc_path,
        media_type="application/pdf",
        headers=headers
    )


@app.get("/api/download-all")
def download_all_zip():
    """Creates and returns a ZIP archive containing all cleaned PDFs."""
    zip_buffer = io.BytesIO()
    count = 0
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file_id, record in files_db.items():
            proc_path = record.get("processed_path")
            if proc_path and os.path.exists(proc_path) and record["status"] in ("SUCCESS", "NO_MATCH", "NEEDS_REVIEW"):
                zip_file.write(proc_path, arcname=record["processed_filename"])
                count += 1
    
    if count == 0:
        raise HTTPException(status_code=400, detail="No processed files available for download.")

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=cleaned_financial_reports.zip"}
    )


@app.delete("/api/clear")
def clear_all():
    """Clears all session files and resets memory state and Supabase tables."""
    files_db.clear()
    if supabase_service.is_enabled:
        supabase_service.clear_all()
    for directory in [UPLOAD_DIR, PROCESSED_DIR]:
        if os.path.exists(directory):
            for fname in os.listdir(directory):
                p = os.path.join(directory, fname)
                try:
                    if os.path.isfile(p):
                        os.remove(p)
                except Exception:
                    pass
    return {"message": "All session files cleared."}
    

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
