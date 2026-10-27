import pymupdf
import os

def create_sample_tracxn_pdf(output_path: str, pages: int = 3) -> str:
    """
    Creates a realistic multi-page financial statement PDF mimicking Tracxn converted reports,
    featuring the exact disclaimer in red header on select pages.
    """
    dir_name = os.path.dirname(output_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    doc = pymupdf.open()
    
    # Page 1: Cover / Disclosure of General Information with the Red Disclaimer
    page1 = doc.new_page(width=595, height=842)  # A4 size in points
    
    # 1. Exact Red Disclaimer at the top
    disclaimer_text = "Disclaimer: The file has been converted by Tracxn to improve readabilty of financial data"
    # Centered at top, red color (RGB: 1.0, 0.0, 0.0)
    page1.insert_text(
        pymupdf.Point(75, 42),
        disclaimer_text,
        fontsize=10.5,
        fontname="helv",
        color=(0.95, 0.1, 0.1)
    )

    # 2. Financial Report Title & Header
    page1.insert_text(
        pymupdf.Point(180, 85),
        "ULTRA GAS & ENERGY LIMITED",
        fontsize=14,
        fontname="hebo",
        color=(0.1, 0.1, 0.1)
    )
    page1.insert_text(
        pymupdf.Point(135, 105),
        "Standalone Financial Statements for period 01/04/2022 to 31/03/2023",
        fontsize=10.5,
        fontname="helv",
        color=(0.2, 0.2, 0.2)
    )

    # 3. Section Title
    page1.insert_text(
        pymupdf.Point(145, 150),
        "[700300] Disclosure of general information about company",
        fontsize=11.5,
        fontname="hebo",
        color=(0.05, 0.05, 0.05)
    )
    page1.insert_text(
        pymupdf.Point(240, 172),
        "Unless otherwise specified, all monetary values are in Thousands of INR",
        fontsize=8.5,
        fontname="helv",
        color=(0.4, 0.4, 0.4)
    )

    # 4. Table border and rows
    table_rect = pymupdf.Rect(50, 185, 545, 450)
    page1.draw_rect(table_rect, color=(0.3, 0.3, 0.3), width=0.8)
    
    # Header cells
    page1.draw_line(pymupdf.Point(50, 220), pymupdf.Point(545, 220), color=(0.5, 0.5, 0.5), width=0.5)
    page1.draw_line(pymupdf.Point(350, 185), pymupdf.Point(350, 450), color=(0.5, 0.5, 0.5), width=0.5)
    page1.draw_line(pymupdf.Point(450, 185), pymupdf.Point(450, 450), color=(0.5, 0.5, 0.5), width=0.5)

    page1.insert_text(pymupdf.Point(365, 202), "01/04/2022\nto 31/03/2023", fontsize=8, fontname="hebo")
    page1.insert_text(pymupdf.Point(465, 202), "01/04/2021\nto 31/03/2022", fontsize=8, fontname="hebo")

    # Table rows
    rows = [
        ("Name of company", "ULTRA GAS & ENERGY LIMITED", ""),
        ("Corporate identity number", "U40200MH2020PLC339582", ""),
        ("Permanent account number of entity", "AACCU5891Q", ""),
        ("Nature of report standalone consolidated", "Standalone", ""),
        ("Content of report", "Financial Statements", ""),
        ("Turnover of product or service category", "37,259.95", "69,596.52"),
        ("Highest turnover contributing service code", "85153990", "85153990"),
        ("Profit/(Loss) after tax", "(75,551.93)", "2,947.58")
    ]

    y = 240
    for label, v1, v2 in rows:
        page1.draw_line(pymupdf.Point(50, y + 8), pymupdf.Point(545, y + 8), color=(0.8, 0.8, 0.8), width=0.4)
        page1.insert_text(pymupdf.Point(60, y), label, fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))
        page1.insert_text(pymupdf.Point(360, y), v1, fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))
        page1.insert_text(pymupdf.Point(460, y), v2, fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))
        y += 24

    # Page 2: Directors Report (Clean page without disclaimer)
    page2 = doc.new_page(width=595, height=842)
    page2.insert_text(
        pymupdf.Point(50, 40),
        "ULTRA GAS & ENERGY LIMITED Standalone Financial Statements for period 01/04/2022 to 31/03/2023",
        fontsize=8,
        fontname="helv",
        color=(0.5, 0.5, 0.5)
    )
    page2.insert_text(
        pymupdf.Point(200, 90),
        "[700600] Disclosures - Directors report",
        fontsize=12,
        fontname="hebo",
        color=(0.1, 0.1, 0.1)
    )
    page2.insert_text(
        pymupdf.Point(50, 130),
        "Your Directors have pleasure in presenting 03rd Annual Report and Audited Statements for FY23.",
        fontsize=9.5,
        fontname="helv"
    )
    page2.insert_text(
        pymupdf.Point(50, 155),
        "1. FINANCIAL SUMMARY & HIGHLIGHTS OF THE COMPANY (Amount in Thousands INR):",
        fontsize=9.5,
        fontname="hebo"
    )
    # Draw simple table on page 2
    page2.draw_rect(pymupdf.Rect(50, 175, 545, 340), color=(0.3, 0.3, 0.3), width=0.8)
    p2_rows = [
        ("Total Income", "39,329.06", "69,646.90"),
        ("Total Expenditure", "1,10,171.68", "65,067.26"),
        ("Profit/(Loss) before Tax", "(77,642.31)", "4,579.64"),
        ("Income Tax Provisions", "(926.96)", "1,412.00"),
        ("Profit/(Loss) after Tax", "(75,551.93)", "2,947.58"),
    ]
    y = 205
    for label, v1, v2 in p2_rows:
        page2.draw_line(pymupdf.Point(50, y + 8), pymupdf.Point(545, y + 8), color=(0.85, 0.85, 0.85), width=0.4)
        page2.insert_text(pymupdf.Point(60, y), label, fontsize=9, fontname="helv")
        page2.insert_text(pymupdf.Point(360, y), v1, fontsize=9, fontname="hebo")
        page2.insert_text(pymupdf.Point(460, y), v2, fontsize=9, fontname="hebo")
        y += 26

    # Page 3: Balance Sheet (also has Disclaimer to test multi-page removal)
    page3 = doc.new_page(width=595, height=842)
    # Add disclaimer on page 3 as well
    page3.insert_text(
        pymupdf.Point(75, 42),
        "Disclaimer: The file has been converted by Tracxn to improve readabilty of financial data",
        fontsize=10.5,
        fontname="helv",
        color=(0.95, 0.1, 0.1)
    )
    page3.insert_text(
        pymupdf.Point(215, 90),
        "[110000] Standalone Balance Sheet",
        fontsize=12,
        fontname="hebo",
        color=(0.1, 0.1, 0.1)
    )
    page3.draw_rect(pymupdf.Rect(50, 130, 545, 380), color=(0.3, 0.3, 0.3), width=0.8)
    bs_items = [
        ("Property, plant and equipment", "69,201.53", "24,080.25"),
        ("Capital work-in-progress", "6,78,474.46", "3,99,658.06"),
        ("Non-current investments", "13,781.31", "0.00"),
        ("Current Trade receivables", "0.00", "11,279.03"),
        ("Cash and cash equivalents", "27,120.92", "2,304.68"),
        ("Total Assets", "9,85,241.86", "5,31,973.85"),
        ("Total Equity", "(23,916.24)", "52,799.10"),
        ("Total Liabilities", "10,09,158.10", "4,79,174.75"),
    ]
    y = 160
    for label, v1, v2 in bs_items:
        page3.draw_line(pymupdf.Point(50, y + 8), pymupdf.Point(545, y + 8), color=(0.85, 0.85, 0.85), width=0.4)
        page3.insert_text(pymupdf.Point(60, y), label, fontsize=9, fontname="helv")
        page3.insert_text(pymupdf.Point(360, y), v1, fontsize=9, fontname="hebo")
        page3.insert_text(pymupdf.Point(460, y), v2, fontsize=9, fontname="hebo")
        y += 26

    # Generate additional pages if pages > 3
    if pages > 3:
        for p_idx in range(4, pages + 1):
            extra_page = doc.new_page(width=595, height=842)
            extra_page.insert_text(
                pymupdf.Point(75, 42),
                "Disclaimer: The file has been converted by Tracxn to improve readabilty of financial data",
                fontsize=10.5,
                fontname="helv",
                color=(0.95, 0.1, 0.1)
            )
            extra_page.insert_text(
                pymupdf.Point(180, 100),
                f"ULTRA GAS & ENERGY LIMITED - Financial Annexure Page {p_idx}",
                fontsize=11,
                fontname="hebo"
            )

    doc.save(output_path)
    doc.close()
    return output_path

if __name__ == "__main__":
    test_path = "sample_financial_report.pdf"
    create_sample_tracxn_pdf(test_path)
    print("Created sample PDF at:", test_path)
