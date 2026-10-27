import os
import time
import threading
from fastapi.testclient import TestClient
import main
from sample_generator import create_sample_tracxn_pdf
import pymupdf

client = TestClient(main.app)

def test_single_conversion_cancellation():
    print("\n--- TEST: Real-time Conversion Cancellation ---")
    
    # 1. Create a 100-page PDF for processing
    tmp_path = os.path.join(main.TEMP_DIR, "test_multi_cancel_gen.pdf")
    create_sample_tracxn_pdf(tmp_path, pages=100)
    with open(tmp_path, "rb") as f:
        test_pdf_bytes = f.read()
    
    # 2. Upload the file
    upload_resp = client.post(
        "/api/upload",
        files={"files": ("test_multi_cancel.pdf", test_pdf_bytes, "application/pdf")}
    )
    assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
    file_id = upload_resp.json()["files"][0]["id"]
    print(f"Uploaded 100-page test PDF: file_id={file_id}")
    
    # 3. Start processing concurrently in worker thread (as occurs under real uvicorn)
    t = threading.Thread(target=main.execute_pdf_processing, args=(file_id,))
    t.start()
    
    # Wait until it starts processing
    time.sleep(0.08)
    
    # 4. Request cancellation while worker thread is actively processing pages
    cancel_resp = client.post(f"/api/cancel/{file_id}")
    assert cancel_resp.status_code == 200
    print(f"Cancellation response: {cancel_resp.json()}")
    
    t.join(timeout=3.0)
    
    files_resp = client.get("/api/files")
    files = files_resp.json()["files"]
    target = next((f for f in files if f["id"] == file_id), None)
    assert target is not None, "File record not found in files_db"
    
    print(f"File status after cancellation: {target['status']}, scanned {target['pages_scanned']} of {target['page_count']}")
    assert target["status"] == "CANCELLED", f"Expected CANCELLED, got {target['status']}"
    assert target["pages_scanned"] < target["page_count"], "Worker should have aborted before completing all pages"
    print(">>> Single conversion cancellation verified successfully!")

    # 5. Verify restarting after cancellation
    t_restart = threading.Thread(target=main.execute_pdf_processing, args=(file_id,))
    t_restart.start()
    t_restart.join(timeout=10.0)
    
    files_resp = client.get("/api/files")
    target = next((f for f in files_resp.json()["files"] if f["id"] == file_id), None)
    print(f"File status after restart completion: {target['status']}")
    assert target["status"] == "SUCCESS", f"Unexpected status: {target['status']}"
    print(">>> Restart workflow verified successfully!")

def test_cancel_all():
    print("\n--- TEST: Batch Cancel All ---")
    tmp_path = os.path.join(main.TEMP_DIR, "test_batch_cancel_gen.pdf")
    create_sample_tracxn_pdf(tmp_path, pages=80)
    with open(tmp_path, "rb") as f:
        test_pdf_bytes = f.read()
    
    # Upload 2 files
    up1 = client.post("/api/upload", files={"files": ("cancel_batch_1.pdf", test_pdf_bytes, "application/pdf")})
    up2 = client.post("/api/upload", files={"files": ("cancel_batch_2.pdf", test_pdf_bytes, "application/pdf")})
    
    fid1 = up1.json()["files"][0]["id"]
    fid2 = up2.json()["files"][0]["id"]
    
    t1 = threading.Thread(target=main.execute_pdf_processing, args=(fid1,))
    t2 = threading.Thread(target=main.execute_pdf_processing, args=(fid2,))
    t1.start()
    t2.start()
    
    time.sleep(0.08)
    
    cancel_all_resp = client.post("/api/cancel-all")
    assert cancel_all_resp.status_code == 200
    print(f"Cancel-all response: {cancel_all_resp.json()}")
    
    t1.join(timeout=3.0)
    t2.join(timeout=3.0)
    
    files_resp = client.get("/api/files")
    files = {f["id"]: f for f in files_resp.json()["files"]}
    
    print(f"Batch file 1 status: {files[fid1]['status']}")
    print(f"Batch file 2 status: {files[fid2]['status']}")
    assert files[fid1]["status"] in ("CANCELLED", "CANCELLATION_REQUESTED")
    assert files[fid2]["status"] in ("CANCELLED", "CANCELLATION_REQUESTED")
    print(">>> Cancel-all verified successfully!")

if __name__ == "__main__":
    test_single_conversion_cancellation()
    test_cancel_all()
    print("\n==================================================")
    print("ALL CANCELLATION WORKFLOW TESTS PASSED 100%!")
    print("==================================================")
