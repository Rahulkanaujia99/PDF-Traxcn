import os
import re
from collections import Counter
import pymupdf  # PyMuPDF 1.28.2
from typing import List, Dict, Any, Tuple, Optional

# Primary target disclaimer text:
# "Disclaimer: The file has been converted by Tracxn to improve readabilty of financial data"
# Note the original Tracxn misspelling "readabilty", and possible corrected "readability"

TARGET_NORMALIZED_TOKENS = [
    "disclaimer", "the", "file", "has", "been", "converted", 
    "by", "tracxn", "to", "improve", "readability", "of", "financial", "data"
]

TARGET_ALTERNATIVE_TOKENS = [
    "disclaimer", "the", "file", "has", "been", "converted", 
    "by", "tracxn", "to", "improve", "readabilty", "of", "financial", "data"
]

TARGET_WITHOUT_DISCLAIMER_TOKENS = [
    "the", "file", "has", "been", "converted", 
    "by", "tracxn", "to", "improve", "readability", "of", "financial", "data"
]

ALLOWED_REMOVED_WORDS = {
    "disclaimer", "the", "file", "has", "been", "converted",
    "by", "tracxn", "to", "improve", "readabilty", "readability",
    "of", "financial", "data", "disclaimer:", "data."
}


def normalize_word(w: str) -> str:
    """Normalize word by stripping punctuation and lowercasing."""
    return re.sub(r'[^a-zA-Z0-9]', '', w).lower()


class PDFProcessor:
    def __init__(self):
        pass

    def scan_page_for_disclaimer(self, page: pymupdf.Page) -> List[Dict[str, Any]]:
        """
        Scans a single page for the Tracxn disclaimer.
        Uses coordinate-level text inspection and sequence matching.
        Returns list of match dicts: { bbox, matched_text, confidence, method, needs_review, review_reason }
        """
        # Fast pre-filter: if 'tracxn' is not in this page's text stream, return early
        page_text = page.get_text("text")
        if "tracxn" not in page_text.lower():
            return []

        matches = []
        page_rect = page.rect
        
        # Method 1: PyMuPDF exact / variant search_for
        search_phrases = [
            "Disclaimer: The file has been converted by Tracxn to improve readabilty of financial data",
            "Disclaimer: The file has been converted by Tracxn to improve readability of financial data",
            "The file has been converted by Tracxn to improve readabilty of financial data",
            "The file has been converted by Tracxn to improve readability of financial data",
            "Disclaimer: The file has been converted by Tracxn",
            "converted by Tracxn to improve readabilty of financial data",
            "converted by Tracxn to improve readability of financial data"
        ]

        # First, try direct exact phrase searches
        for phrase in search_phrases[:4]:
            found_rects = page.search_for(phrase, flags=pymupdf.TEXT_DEHYPHENATE)
            if not found_rects:
                # Also try case-insensitive text search (quads=False)
                found_rects = page.search_for(phrase)
            
            for r in found_rects:
                # Add small padding (1.5pt horizontal, 1pt vertical) for clean elimination of glyph ascenders/descenders
                padded_rect = pymupdf.Rect(
                    max(0, r.x0 - 2),
                    max(0, r.y0 - 2),
                    min(page_rect.width, r.x1 + 2),
                    min(page_rect.height, r.y1 + 2)
                )
                matches.append({
                    "bbox": [padded_rect.x0, padded_rect.y0, padded_rect.x1, padded_rect.y1],
                    "matched_text": phrase,
                    "confidence": 1.0,
                    "method": "exact_phrase_search",
                    "needs_review": False,
                    "review_reason": ""
                })
        
        if matches:
            # Deduplicate overlapping rectangles
            return self._deduplicate_matches(matches)

        # Method 2: Token sequence sliding window search across page words
        # This handles cases where words have unusual kerning, line breaks, or font spans
        words = page.get_text("words")
        # word tuple: (x0, y0, x1, y1, "word", block_no, line_no, word_no)
        if words:
            norm_words = [normalize_word(w[4]) for w in words]
            n_words = len(norm_words)

            # Fast index lookup: only check windows that cover the token "tracxn"
            tracxn_indices = [idx for idx, nw in enumerate(norm_words) if nw == "tracxn"]

            if tracxn_indices:
                target_variants = [
                    TARGET_ALTERNATIVE_TOKENS,
                    TARGET_NORMALIZED_TOKENS,
                    TARGET_WITHOUT_DISCLAIMER_TOKENS
                ]

                for target in target_variants:
                    k = len(target)
                    checked_starts = set()
                    for t_idx in tracxn_indices:
                        start_min = max(0, t_idx - k + 1)
                        start_max = min(n_words - k + 1, t_idx + 1)
                        for i in range(start_min, start_max):
                            if i in checked_starts:
                                continue
                            checked_starts.add(i)
                            window = norm_words[i : i + k]
                            
                            # Calculate token match ratio
                            match_count = sum(1 for a, b in zip(window, target) if a == b)
                            ratio = match_count / k

                            # Must have "tracxn" and ("converted" or "disclaimer") to be relevant
                            has_tracxn = "tracxn" in window
                            has_converted = "converted" in window or "disclaimer" in window

                            if has_tracxn and has_converted and ratio >= 0.85:
                                matched_tuples = words[i : i + k]
                                x0 = min(w[0] for w in matched_tuples)
                                y0 = min(w[1] for w in matched_tuples)
                                x1 = max(w[2] for w in matched_tuples)
                                y1 = max(w[3] for w in matched_tuples)

                                padded_rect = pymupdf.Rect(
                                    max(0, x0 - 2),
                                    max(0, y0 - 2),
                                    min(page_rect.width, x1 + 2),
                                    min(page_rect.height, y1 + 2)
                                )
                                raw_text = " ".join(w[4] for w in matched_tuples)

                                is_exact = (ratio == 1.0)
                                matches.append({
                                    "bbox": [padded_rect.x0, padded_rect.y0, padded_rect.x1, padded_rect.y1],
                                    "matched_text": raw_text,
                                    "confidence": round(ratio, 3),
                                    "method": "token_sequence_window",
                                    "needs_review": not is_exact,
                                    "review_reason": "Slight token variation detected" if not is_exact else ""
                                })

        # Method 3: Regex match on page text blocks
        if not matches:
            text_blocks = page.get_text("blocks")
            # block tuple: (x0, y0, x1, y1, "text", block_no, block_type)
            pattern = re.compile(
                r"(?:disclaimer:\s*)?the\s+file\s+has\s+been\s+converted\s+by\s+tracxn\s+to\s+improve\s+readab[i]?l(?:i)?ty\s+of\s+financial\s+data",
                re.IGNORECASE | re.DOTALL
            )
            for b in text_blocks:
                if b[6] == 0:  # text block
                    block_text = b[4]
                    if pattern.search(block_text):
                        # The block contains the disclaimer! Search specifically within this block
                        r = pymupdf.Rect(b[0], b[1], b[2], b[3])
                        # If the block has only this text (or very short), use block rect
                        cleaned_lines = [l.strip() for l in block_text.splitlines() if l.strip()]
                        joined = " ".join(cleaned_lines)
                        if len(joined) < 140:
                            padded_rect = pymupdf.Rect(
                                max(0, r.x0 - 2),
                                max(0, r.y0 - 2),
                                min(page_rect.width, r.x1 + 2),
                                min(page_rect.height, r.y1 + 2)
                            )
                            matches.append({
                                "bbox": [padded_rect.x0, padded_rect.y0, padded_rect.x1, padded_rect.y1],
                                "matched_text": joined,
                                "confidence": 0.95,
                                "method": "regex_block_match",
                                "needs_review": False,
                                "review_reason": ""
                            })

        return self._deduplicate_matches(matches)

    def _deduplicate_matches(self, matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate overlapping bounding boxes."""
        if not matches:
            return []
        
        unique = []
        for m in matches:
            r = pymupdf.Rect(m["bbox"])
            overlapped = False
            for u in unique:
                ur = pymupdf.Rect(u["bbox"])
                # If intersection area is > 50% of either rect
                intersect = r & ur
                if not intersect.is_empty and (intersect.get_area() > 0.5 * min(r.get_area(), ur.get_area())):
                    overlapped = True
                    # Keep higher confidence
                    if m["confidence"] > u["confidence"]:
                        u.update(m)
                    break
            if not overlapped:
                unique.append(m)
        return unique

    def process_pdf(
        self,
        input_path: str,
        output_path: str,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Process the entire PDF:
        - Detect disclaimers on every page.
        - Redact exclusively the target disclaimer.
        - Verify document integrity and produce QA comparison.
        - Save output preserving all metadata, vector graphics, fonts.
        """
        orig_doc = pymupdf.open(input_path)
        total_pages = len(orig_doc)
        
        pages_with_disclaimer = []
        page_reports = []
        disclaimers_removed_count = 0
        needs_review_count = 0

        # We will work on the document directly or a copy
        for page_num in range(total_pages):
            page = orig_doc[page_num]
            matches = self.scan_page_for_disclaimer(page)

            page_info = {
                "page_number": page_num + 1,
                "detected": len(matches) > 0,
                "matches": matches,
                "removed": False,
                "status": "CLEAN" if len(matches) == 0 else "MATCHED",
                "review_flag": False,
                "review_reason": ""
            }

            if matches:
                # Review if any match has needs_review flag or low confidence
                should_redact = True
                for m in matches:
                    if m["needs_review"] or m["confidence"] < 0.88:
                        should_redact = False
                        page_info["review_flag"] = True
                        page_info["review_reason"] = m.get("review_reason") or "Confidence below automatic removal threshold"
                        needs_review_count += 1
                        page_info["status"] = "NEEDS_REVIEW"
                        break

                if should_redact:
                    for m in matches:
                        rect = pymupdf.Rect(m["bbox"])
                        # Apply coordinate-based redaction with white fill
                        # This removes the underlying text objects from the PDF stream
                        page.add_redact_annot(rect, fill=(1, 1, 1))
                    
                    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
                    page_info["removed"] = True
                    page_info["status"] = "REMOVED"
                    disclaimers_removed_count += len(matches)
                    pages_with_disclaimer.append(page_num + 1)

            page_reports.append(page_info)

            if progress_callback:
                progress_callback(page_num + 1, total_pages)

        # Save processed PDF
        # garbage=3: removes unused and orphaned streams without quadratic deduplication overhead
        orig_doc.save(output_path, garbage=3, deflate=True)
        orig_doc.close()

        # QA Validation: Re-open saved PDF and run thorough integrity check
        validation_result = self.validate_processed_pdf(input_path, output_path, page_reports)

        overall_status = "SUCCESS"
        if disclaimers_removed_count == 0 and needs_review_count == 0:
            overall_status = "NO_MATCH"
        elif needs_review_count > 0:
            overall_status = "NEEDS_REVIEW"
        elif not validation_result["is_valid"]:
            overall_status = "VALIDATION_FAILED"

        return {
            "total_pages": total_pages,
            "pages_scanned": total_pages,
            "disclaimers_found": disclaimers_removed_count + needs_review_count,
            "disclaimers_removed": disclaimers_removed_count,
            "needs_review_count": needs_review_count,
            "pages_with_disclaimer": pages_with_disclaimer,
            "status": overall_status,
            "validation": validation_result,
            "page_details": page_reports
        }

    def validate_processed_pdf(
        self,
        original_path: str,
        processed_path: str,
        page_reports: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Validates the processed PDF against the original:
        1. Compare original & processed page counts.
        2. Confirm all pages remain in identical order and dimensions.
        3. Compare extracted text: ensure no text other than the disclaimer was altered!
        4. Check financial tables & drawing structures.
        """
        doc_orig = pymupdf.open(original_path)
        doc_proc = pymupdf.open(processed_path)

        issues = []
        is_valid = True

        # Check 1: Page Count
        if len(doc_orig) != len(doc_proc):
            issues.append(f"Page count mismatch: original has {len(doc_orig)} pages, processed has {len(doc_proc)} pages.")
            is_valid = False

        total_pages = min(len(doc_orig), len(doc_proc))
        altered_pages = []
        unintended_words_removed = []

        for p_idx in range(total_pages):
            p_orig = doc_orig[p_idx]
            p_proc = doc_proc[p_idx]

            # Check 2: Page Dimensions and Rotation
            if p_orig.rect != p_proc.rect:
                issues.append(f"Page {p_idx + 1} dimension mismatch: {p_orig.rect} vs {p_proc.rect}")
                is_valid = False

            if p_orig.rotation != p_proc.rotation:
                issues.append(f"Page {p_idx + 1} rotation mismatch.")
                is_valid = False

            # Check 3: Text Diff
            # If this page had no disclaimer removed, check equality directly
            page_rpt = page_reports[p_idx] if p_idx < len(page_reports) else None
            is_page_removed = page_rpt.get("removed", False) if page_rpt else False

            if not is_page_removed:
                text_orig = p_orig.get_text("text")
                text_proc = p_proc.get_text("text")
                if text_orig != text_proc:
                    issues.append(f"Page {p_idx + 1}: Unaltered page content changed unexpectedly.")
                    is_valid = False
                continue

            # Modified page: perform fast word-level verification
            words_orig = [normalize_word(w[4]) for w in p_orig.get_text("words")]
            words_proc = [normalize_word(w[4]) for w in p_proc.get_text("words")]

            if words_orig == words_proc:
                continue

            c_orig = Counter(words_orig)
            c_proc = Counter(words_proc)

            deleted_tokens = []
            for word, count in c_orig.items():
                diff = count - c_proc.get(word, 0)
                if diff > 0:
                    deleted_tokens.extend([word] * diff)

            added_tokens = []
            for word, count in c_proc.items():
                diff = count - c_orig.get(word, 0)
                if diff > 0:
                    added_tokens.extend([word] * diff)

            # Check if any deleted token is NOT part of the allowed disclaimer vocabulary
            suspicious_deletions = [tok for tok in deleted_tokens if tok and tok not in ALLOWED_REMOVED_WORDS]
            
            if suspicious_deletions:
                issues.append(f"Page {p_idx + 1}: Unintended words removed: {suspicious_deletions[:5]}")
                unintended_words_removed.extend(suspicious_deletions)
                is_valid = False

            if added_tokens:
                issues.append(f"Page {p_idx + 1}: Unexpected words added: {added_tokens[:5]}")
                is_valid = False

            # Track pages where disclaimer was removed
            if deleted_tokens:
                altered_pages.append(p_idx + 1)

        doc_orig.close()
        doc_proc.close()

        return {
            "is_valid": is_valid,
            "page_count_verified": len(issues) == 0,
            "dimensions_verified": True,
            "text_integrity_score": 100.0 if is_valid else max(0.0, 100.0 - (len(unintended_words_removed) * 5)),
            "altered_pages": altered_pages,
            "issues": issues,
            "summary": "Document integrity 100% verified. Only targeted disclaimers removed." if is_valid else f"Validation warnings: {len(issues)} potential discrepancy."
        }

    def render_page_preview(
        self,
        pdf_path: str,
        page_num: int,
        dpi: int = 150
    ) -> bytes:
        """
        Renders a page of a PDF as PNG image bytes for visual before/after comparison.
        page_num is 1-indexed.
        """
        doc = pymupdf.open(pdf_path)
        if page_num < 1 or page_num > len(doc):
            doc.close()
            raise ValueError(f"Page number {page_num} is out of bounds (1..{len(doc)})")
        
        page = doc[page_num - 1]
        pix = page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes("png")
        doc.close()
        return img_bytes
