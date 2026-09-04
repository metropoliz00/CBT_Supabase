/**
 * Centralized Print Styles & Helpers for A4 Paper with 10mm Margin
 * Ensures consistent, pixel-precise printing across all browsers and printer settings.
 */

export interface PrintStylesOptions {
  orientation?: 'portrait' | 'landscape';
  margin?: string; // default '10mm'
  fontSize?: string; // default '9pt' or '10pt'
}

export const getA4PrintCss = (options: PrintStylesOptions = {}): string => {
  const {
    orientation = 'portrait',
    margin = '10mm',
    fontSize = orientation === 'landscape' ? '8.5pt' : '9.5pt',
  } = options;

  return `
    /* ===================================================
       UNIVERSAL A4 PRINT STYLES - PRECISION 10MM MARGIN
       =================================================== */
    @page {
      size: A4 ${orientation};
      margin: ${margin} !important;
    }

    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Times New Roman', Times, serif, 'Plus Jakarta Sans', Arial, sans-serif;
      font-size: ${fontSize};
      line-height: 1.25;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }

    /* Screen Preview styling */
    @media screen {
      body {
        background-color: #f1f5f9 !important;
        padding: 20px !important;
        display: flex;
        justify-content: center;
      }
      .document-sheet, .page-container, .print-wrapper {
        background: #ffffff !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        padding: ${margin} !important;
        width: ${orientation === 'landscape' ? '297mm' : '210mm'};
        min-height: ${orientation === 'landscape' ? '210mm' : '297mm'};
        margin: 0 auto !important;
        box-sizing: border-box !important;
      }
    }

    @media print {
      body {
        background-color: #ffffff !important;
        padding: 0 !important;
      }
      .document-sheet, .page-container, .print-wrapper {
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .no-print, button, .btn {
        display: none !important;
      }
    }

    /* Header Container */
    .header-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px double #000000;
      padding-bottom: 8px;
      margin-bottom: 12px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      width: 100%;
    }

    .logo {
      height: 65px;
      width: auto;
      max-width: 80px;
      object-fit: contain;
    }

    .header-text {
      text-align: center;
      flex: 1;
      padding: 0 12px;
    }

    .header-text h2 {
      margin: 0;
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      line-height: 1.2;
    }

    .header-text h3 {
      margin: 3px 0 0;
      font-size: 11pt;
      font-weight: 600;
      line-height: 1.2;
    }

    .header-text .header-desc {
      margin: 2px 0 0;
      font-size: 9pt;
      font-style: italic;
    }

    /* Information / Metadata Table */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9.5pt;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .info-table td {
      border: none !important;
      padding: 2px 4px !important;
      vertical-align: top;
      color: #000000 !important;
    }

    /* Main Data Table */
    table.main-table, .table-print {
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse !important;
      border-spacing: 0 !important;
      margin: 0 0 14px 0 !important;
      font-size: ${fontSize} !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
    }

    table.main-table th, table.main-table td,
    .table-print th, .table-print td {
      border: 1px solid #000000 !important;
      padding: 4px 6px !important;
      color: #000000 !important;
      line-height: 1.2 !important;
      vertical-align: middle !important;
    }

    table.main-table th, .table-print th {
      background-color: #f0f0f0 !important;
      font-weight: bold !important;
      text-align: center !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    thead {
      display: table-header-group !important;
    }

    tfoot {
      display: table-footer-group !important;
    }

    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Text alignment utilities */
    .text-center { text-align: center !important; }
    .text-left { text-align: left !important; }
    .text-right { text-align: right !important; }
    .font-bold { font-weight: bold !important; }

    /* Signature Section */
    .signature-section {
      margin-top: 20px;
      float: right;
      width: 220px;
      text-align: center;
      font-size: 9.5pt;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      clear: both;
    }

    .signature-section p {
      margin: 0;
      line-height: 1.3;
    }

    .signature-section .sig-space {
      height: 55px;
    }

    .signature-section .signer-name {
      font-weight: bold;
      text-decoration: underline;
      margin-top: 4px;
    }

    /* Page Break Utilities */
    .page-break {
      page-break-after: always !important;
      break-after: page !important;
    }

    .no-break {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  `;
};

/**
 * Safely writes HTML content to a newly opened popup window and triggers print.
 */
export const triggerPrintWindow = (
  printWindow: Window,
  title: string,
  bodyHtml: string,
  options: PrintStylesOptions = {}
) => {
  const css = getA4PrintCss(options);
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3E%3Cpath d='M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 12v2H8v-2h8zm2-2v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4h-2z'/%3E%3Ccircle cx='18' cy='11.5' r='1'/%3E%3C/svg%3E" />
  <style>
    ${css}
  </style>
</head>
<body>
  <div class="print-wrapper">
    ${bodyHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
