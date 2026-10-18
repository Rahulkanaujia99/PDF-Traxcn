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
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel
import pymupdf

from pdf_processor import PDFProcessor
from sample_generator import create_sample_tracxn_pdf

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


@app.on_event("startup")
async def startup_event():
    cleanup_old_files()


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
            page_count = len(doc)
            doc.close()
        except Exception as e:
            if os.path.exists(upload_path):
                os.remove(upload_path)
            return JSONResponse(
                status_code=400,
                content={"error": f"Failed to parse '{safe_filename}'. Document may be corrupted."}
            )

        record = {
            "id": file_id,
            "filename": safe_filename,
            "processed_filename": safe_filename.rsplit(".", 1)[0] + "_cleaned.pdf",
            "size": file_size,
            "formatted_size": format_size(file_size),
            "page_count": page_count,
            "upload_path": upload_path,
            "processed_path": None,
            "status": "READY",  # READY, PROCESSING, SUCCESS, NO_MATCH, NEEDS_REVIEW, FAILED
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
    doc.close()

    record = {
        "id": file_id,
        "filename": filename,
        "processed_filename": filename.rsplit(".", 1)[0] + "_cleaned.pdf",
        "size": file_size,
        "formatted_size": format_size(file_size),
        "page_count": page_count,
        "upload_path": upload_path,
        "processed_path": None,
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
    return {"file": record}


def execute_pdf_processing(file_id: str):
    """Worker function to process single PDF with real-time progress."""
    record = files_db.get(file_id)
    if not record:
        return

    record["status"] = "PROCESSING"
    record["progress"] = 5

    try:
        input_path = record["upload_path"]
        output_filename = record["processed_filename"]
        output_path = os.path.join(PROCESSED_DIR, f"{file_id}_{output_filename}")

        def on_progress(current, total):
            pct = int((current / total) * 85) + 10
            record["progress"] = pct
            record["pages_scanned"] = current

        result = processor.process_pdf(input_path, output_path, progress_callback=on_progress)

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

    except Exception as e:
        record["status"] = "FAILED"
        record["progress"] = 100
        record["error_message"] = f"Processing error: {str(e)}"


@app.post("/api/process/{file_id}")
async def process_file(file_id: str, background_tasks: BackgroundTasks):
    """Processes a single uploaded PDF."""
    if file_id not in files_db:
        raise HTTPException(status_code=404, detail="File not found")
    
    background_tasks.add_task(execute_pdf_processing, file_id)
    return {"message": "Processing started", "file_id": file_id}


@app.post("/api/process-all")
async def process_all_files(background_tasks: BackgroundTasks):
    """Batch processes all uploaded PDFs."""
    started_ids = []
    for file_id, record in files_db.items():
        if record["status"] in ("READY", "FAILED"):
            background_tasks.add_task(execute_pdf_processing, file_id)
            started_ids.append(file_id)
    
    return {"message": "Batch processing initiated", "files_count": len(started_ids), "file_ids": started_ids}


@app.get("/api/files")
def list_files():
    """Returns list of all files with current state."""
    # Convert files_db to list sorted by creation time
    records = list(files_db.values())
    records.sort(key=lambda r: r.get("created_at", 0), reverse=True)
    return {"files": records}


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
    orig_path = record["upload_path"]
    proc_path = record.get("processed_path")

    try:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate page preview: {str(e)}")


@app.get("/api/download/{file_id}")
def download_cleaned_pdf(file_id: str):
    """Downloads the cleaned output PDF with explicit PDF content-type and filename headers."""
    if file_id not in files_db:
        raise HTTPException(status_code=404, detail="File not found")
    
    record = files_db[file_id]
    proc_path = record.get("processed_path")
    if not proc_path or not os.path.exists(proc_path):
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
    """Clears all session files and resets memory state."""
    files_db.clear()
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
