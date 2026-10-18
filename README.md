# PDF Disclaimer Cleaner (Tracxn Disclaimer Removal Tool)

An AI-powered, browser-based PDF processing tool that automatically removes Tracxn converted disclaimers from financial statement PDFs while preserving 100% vector fidelity, text searchability, tables, numbers, and layout geometry.

**Target Text:**
`"Disclaimer: The file has been converted by Tracxn to improve readabilty of financial data"`

---

## Key Features

- **Multi-File & Batch Processing**: Drag-and-drop single or multiple large financial statements.
- **Coordinate-Level Redaction**: Operates directly on vector streams with PyMuPDF; no flattening or lossy image re-compression.
- **Strict QA & Document Integrity Verification**: Performs text and word diffing to confirm that 0 financial numbers, figures, or unrelated text were changed.
- **Interactive Visual Inspector**: Side-by-side and split-screen curtain slider to compare original vs. cleaned pages with bounding box highlight toggles.
- **Audit & Compliance Certificate**: Generates a QA verification report listing modified pages and text integrity score (100%).
- **Batch ZIP Download**: Download individual cleaned PDFs or all files in a single ZIP.
- **Instant Demo**: One-click "Load Sample Financial Report" generates a realistic financial statement for immediate testing.

---

## Project Structure

```
├── backend/
│   ├── main.py                  # FastAPI REST API (upload, process, preview, download, ZIP)
│   ├── pdf_processor.py         # PyMuPDF coordinate redaction & QA integrity engine
│   ├── sample_generator.py      # Generates realistic sample financial report PDFs
│   └── storage/                 # Isolated temporary storage (with 1-hour auto-cleanup)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BeforeAfterSlider.tsx      # Interactive split slider & visual comparison
│   │   │   ├── FileItemCard.tsx           # File queue card with live progress & badges
│   │   │   └── ValidationReportModal.tsx  # QA certificate & audit trail modal
│   │   ├── App.tsx                        # Main dashboard & drag-and-drop interface
│   │   └── index.css                      # Modern FinTech design system & tokens
│   └── vite.config.ts                     # Vite config with API proxy to localhost:8000
```

---

## Running the Application Locally

### 1. Backend (FastAPI + PyMuPDF)
```powershell
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend (React + TypeScript + Vite)
```powershell
cd frontend
npm run dev
```

Open your browser at **`http://127.0.0.1:5173/`**.
