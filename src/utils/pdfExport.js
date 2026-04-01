import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportPDF(elementId, fileName = 'MeasureTwice-FieldManual.pdf') {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found: ' + elementId);

  // Temporarily show all content for capture
  element.style.height = 'auto';
  element.style.overflow = 'visible';

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a1628',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 1200,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth  = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth  = canvas.width;
    const imgHeight = canvas.height;
    const ratio     = pdfWidth / imgWidth;
    const scaledH   = imgHeight * ratio;

    let yOffset = 0;
    while (yOffset < scaledH) {
      if (yOffset > 0) pdf.addPage();

      pdf.addImage(
        imgData,
        'PNG',
        0,
        -yOffset,
        pdfWidth,
        scaledH,
      );
      yOffset += pdfHeight;
    }

    pdf.save(fileName);
  } finally {
    element.style.height = '';
    element.style.overflow = '';
  }
}
