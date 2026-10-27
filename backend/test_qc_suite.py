import os
import sys
import shutil
import json
import io
import zipfile
import pymupdf
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app, files_db, UPLOAD_DIR, PROCESSED_DIR
from pdf_processor import PDFProcessor

client = TestClient(app)
proc = PDFProcessor()

FILE_TRANSASIA = r"C:\Users\RahulKanaujia\.gemini\antigravity-ide\brain\739a5464-1d54-41b9-b481-56c5f685be25\.user_uploaded\media_1793078262185.pdf"
FILE_AOC4 = r"C:\Users\RahulKanaujia\.gemini\antigravity-ide\brain\739a5464-1d54-41b9-b481-56c5f685be25\.user_uploaded\media_1793078262846.pdf"


def run_all_tests():
    print("==================================================")
    print("STARTING COMPREHENSIVE PDF QC TEST SUITE")
    print("==================================================")
    all_passed = True

    # ----------------------------------------------------
    # Test 1: Transasia Bio-Medicals (247 pages)
    # ----------------------------------------------------
    print("\n--- TEST 1: Transasia Bio-Medicals (247 Pages) ---")
    doc_info_1 = proc.analyze_document_structure(FILE_TRANSASIA)
    print(f"Document Structure: {doc_info_1['document_type_label']} (Total: {doc_info_1['total_pages']} pages)")
    assert doc_info_1["document_type"] == "TEXT_BASED", "Expected TEXT_BASED document"
    assert doc_info_1["total_pages"] == 247, "Expected 247 pages"

    out_1 = os.path.join(PROCESSED_DIR, "test_suite_transasia_cleaned.pdf")
    res1 = proc.process_pdf(FILE_TRANSASIA, out_1)
    
    print(f"Status: {res1['status']}")
    print(f"Disclaimers found: {res1['disclaimers_found']}, removed: {res1['disclaimers_removed']}")
    print(f"Integrity Score: {res1['validation']['text_integrity_score']}%")
    print(f"Issues: {res1['validation']['issues']}")
    
    assert res1["status"] == "SUCCESS", f"Test 1 failed with status {res1['status']}"
    assert res1["disclaimers_removed"] == 1, "Expected 1 disclaimer removed"
    assert res1["validation"]["is_valid"] is True, "Validation should be True"
    assert res1["validation"]["text_integrity_score"] == 100.0, "Score should be 100.0"
    assert os.path.exists(out_1) and os.path.getsize(out_1) > 0, "Output file must exist and be non-empty"

    # Verify no tracxn in output
    doc_out_1 = pymupdf.open(out_1)
    assert len(doc_out_1) == 247, "Output page count must match 247"
    assert "tracxn" not in doc_out_1[0].get_text("text").lower(), "Disclaimer must be gone from page 1"
    doc_out_1.close()
    print(">>> TEST 1 PASSED: Transasia processed and validated with 100% vector preservation.")

    # ----------------------------------------------------
    # Test 2: Form AOC-4 (14 pages) - Previously Failing Validation
    # ----------------------------------------------------
    print("\n--- TEST 2: Form AOC-4 (14 Pages) ---")
    doc_info_2 = proc.analyze_document_structure(FILE_AOC4)
    print(f"Document Structure: {doc_info_2['document_type_label']} (Total: {doc_info_2['total_pages']} pages)")
    assert doc_info_2["document_type"] == "TEXT_BASED", "Expected TEXT_BASED document"
    assert doc_info_2["total_pages"] == 14, "Expected 14 pages"

    out_2 = os.path.join(PROCESSED_DIR, "test_suite_aoc4_cleaned.pdf")
    res2 = proc.process_pdf(FILE_AOC4, out_2)
    
    print(f"Status: {res2['status']}")
    print(f"Disclaimers found: {res2['disclaimers_found']}, removed: {res2['disclaimers_removed']}")
    print(f"Integrity Score: {res2['validation']['text_integrity_score']}%")
    print(f"Issues: {res2['validation']['issues']}")
    
    assert res2["status"] == "SUCCESS", f"Test 2 failed with status {res2['status']}"
    assert res2["disclaimers_removed"] == 1, "Expected 1 disclaimer removed"
    assert res2["validation"]["is_valid"] is True, "Validation should be True"
    assert res2["validation"]["text_integrity_score"] == 100.0, "Score should be 100.0"
    assert os.path.exists(out_2) and os.path.getsize(out_2) > 0, "Output file must exist and be non-empty"

    # Verify NO. and AOC-4 are preserved and disclaimer is gone
    doc_out_2 = pymupdf.open(out_2)
    assert len(doc_out_2) == 14, "Output page count must match 14"
    words_p1 = [w[4] for w in doc_out_2[0].get_text("words")]
    assert "NO." in words_p1, "Word 'NO.' MUST be preserved in header"
    assert any("AOC" in w for w in words_p1), "Word 'AOC-4' MUST be preserved in header"
    assert not any("tracxn" in w.lower() for w in words_p1), "Disclaimer must be completely removed"
    doc_out_2.close()
    print(">>> TEST 2 PASSED: Form AOC-4 processed safely, header preserved, 100% integrity score.")

    # ----------------------------------------------------
    # Test 3: Scanned PDF (Pure Image Page)
    # ----------------------------------------------------
    print("\n--- TEST 3: Scanned Document (Image Only) ---")
    scanned_path = os.path.join(PROCESSED_DIR, "test_suite_scanned.pdf")
    doc_s = pymupdf.open()
    from PIL import Image
    im = Image.new("RGB", (400, 500), color=(245, 245, 245))
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    img_bytes = buf.getvalue()
    p_s = doc_s.new_page(width=400, height=500)
    p_s.insert_image(pymupdf.Rect(0, 0, 400, 500), stream=img_bytes)
    doc_s.save(scanned_path)
    doc_s.close()

    doc_info_s = proc.analyze_document_structure(scanned_path)
    print(f"Scanned Document Analysis: {doc_info_s['document_type_label']}")
    assert doc_info_s["document_type"] == "SCANNED", "Expected SCANNED classification"

    out_s = os.path.join(PROCESSED_DIR, "test_suite_scanned_out.pdf")
    res_s = proc.process_pdf(scanned_path, out_s)
    print(f"Status: {res_s['status']}, Found: {res_s['disclaimers_found']}, Removed: {res_s['disclaimers_removed']}")
    assert res_s["status"] == "NO_MATCH", "Scanned document without disclaimer must have status NO_MATCH"
    assert res_s["disclaimers_removed"] == 0, "No disclaimers removed"
    assert os.path.exists(out_s) and os.path.getsize(out_s) > 0, "Output file must be generated and non-empty"
    print(">>> TEST 3 PASSED: Scanned document correctly handled as NO_MATCH with valid downloadable output.")

    # ----------------------------------------------------
    # Test 4: Mixed PDF (Page 1 Scanned Image, Page 2 Selectable Text)
    # ----------------------------------------------------
    print("\n--- TEST 4: Mixed Document (Scanned Page + Text Page) ---")
    mixed_path = os.path.join(PROCESSED_DIR, "test_suite_mixed.pdf")
    doc_m = pymupdf.open()
    # Page 1: image
    p_m1 = doc_m.new_page(width=400, height=500)
    p_m1.insert_image(pymupdf.Rect(0, 0, 400, 500), stream=img_bytes)
    # Page 2: text with disclaimer
    p_m2 = doc_m.new_page(width=400, height=500)
    p_m2.insert_text(pymupdf.Point(50, 50), "Disclaimer: The file has been converted by Tracxn to improve readability of financial data", fontsize=10, color=(1,0,0))
    p_m2.insert_text(pymupdf.Point(50, 100), "Financial Statement Balance Sheet Text", fontsize=12, color=(0,0,0))
    doc_m.save(mixed_path)
    doc_m.close()

    doc_info_m = proc.analyze_document_structure(mixed_path)
    print(f"Mixed Document Analysis: {doc_info_m['document_type_label']}")
    assert doc_info_m["document_type"] == "MIXED", "Expected MIXED classification"

    out_m = os.path.join(PROCESSED_DIR, "test_suite_mixed_out.pdf")
    res_m = proc.process_pdf(mixed_path, out_m)
    print(f"Status: {res_m['status']}, Found: {res_m['disclaimers_found']}, Removed: {res_m['disclaimers_removed']}")
    assert res_m["status"] == "SUCCESS", "Mixed document disclaimer should be removed with SUCCESS"
    assert res_m["disclaimers_removed"] == 1, "Expected 1 disclaimer removed from page 2"
    assert res_m["pages_with_disclaimer"] == [2], "Disclaimer should be on page 2"
    print(">>> TEST 4 PASSED: Mixed document accurately processed and disclaimer removed.")

    # ----------------------------------------------------
    # Test 5: End-to-End API Upload, Process, Download Flow
    # ----------------------------------------------------
    print("\n--- TEST 5: Full API Upload, Process, and Download Endpoints ---")
    files_db.clear()

    # Upload Form AOC-4 via API
    with open(FILE_AOC4, "rb") as f:
        upload_resp = client.post("/api/upload", files={"files": ("flatten_Form_AOC-4.pdf", f, "application/pdf")})
    assert upload_resp.status_code == 200, f"Upload API failed: {upload_resp.text}"
    file_id = upload_resp.json()["files"][0]["id"]
    print(f"File uploaded successfully via API: ID={file_id}")
    assert upload_resp.json()["files"][0]["document_type"] == "TEXT_BASED"
    assert upload_resp.json()["files"][0]["status"] == "READY"

    # Process via API
    proc_resp = client.post(f"/api/process/{file_id}")
    assert proc_resp.status_code == 200, f"Process API failed: {proc_resp.text}"
    
    # Check status
    status_resp = client.get(f"/api/status/{file_id}")
    rec = status_resp.json()
    print(f"Processing Result Status: {rec['status']}")
    print(f"Disclaimers Removed: {rec['disclaimers_removed']}")
    assert rec["status"] == "SUCCESS", f"Expected SUCCESS, got {rec['status']}"
    assert rec["disclaimers_removed"] == 1
    assert rec["validation"]["is_valid"] is True

    # Test Download endpoint
    dl_resp = client.get(f"/api/download/{file_id}")
    assert dl_resp.status_code == 200, f"Download failed: {dl_resp.status_code}"
    assert dl_resp.headers["content-type"] == "application/pdf"
    assert "attachment" in dl_resp.headers["content-disposition"]
    dl_bytes = dl_resp.content
    assert len(dl_bytes) > 100000, "Downloaded PDF must be full size"
    
    # Parse downloaded PDF
    dl_doc = pymupdf.open(stream=dl_bytes, filetype="pdf")
    assert len(dl_doc) == 14, "Downloaded PDF must have 14 pages"
    dl_doc.close()
    print("Downloaded file verified: valid PDF, 14 pages, non-empty.")

    # Test Download All (ZIP)
    zip_resp = client.get("/api/download-all")
    assert zip_resp.status_code == 200
    assert zip_resp.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(zip_resp.content)) as zf:
        namelist = zf.namelist()
        print("ZIP contents:", namelist)
        assert len(namelist) == 1
    print("Download All ZIP verified.")
    print(">>> TEST 5 PASSED: Full upload -> process -> download API workflow verified.")

    print("\n==================================================")
    print("ALL 5 TESTS IN THE QC SUITE PASSED WITH 100% SUCCESS!")
    print("==================================================")
    return True


if __name__ == "__main__":
    success = run_all_tests()
    if not success:
        sys.exit(1)
