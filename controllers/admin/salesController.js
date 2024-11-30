const fs = require('fs');
const path = require('path');
const ExcelJs = require('exceljs');
const PDFDocument = require('pdfkit');

// const getSalesReport = async(req,res)=>{

// }

const downloadReport = async(req,res)=>{
    const format = req.query.format;

  if (format === 'pdf') {
    const pdfPath = path.join(__dirname, '../public/reports/sales-report.pdf');
    const pdfDoc = new PDFDocument();

    
    pdfDoc.pipe(fs.createWriteStream(pdfPath));

    
    pdfDoc.fontSize(18).text('Sales Report', { align: 'center' }).moveDown(2);
    salesData.forEach((sale, index) => {
      pdfDoc.fontSize(12).text(`${index + 1}. Order ID: ${sale.orderId}, Billing Name: ${sale.billingName}, Total: $${sale.total}, Status: ${sale.paymentStatus}`, { align: 'left' });
    });

    pdfDoc.end();

    
    res.download(pdfPath, 'sales-report.pdf');
  } else if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    
    worksheet.addRow(['Order ID', 'Billing Name', 'Date', 'Total', 'Payment Status', 'Payment Method']);

   
    salesData.forEach((sale) => {
      worksheet.addRow([sale.orderId, sale.billingName, sale.date, sale.total, sale.paymentStatus, sale.paymentMethod]);
    });

    const excelPath = path.join(__dirname, '../public/reports/sales-report.xlsx');

    
    await workbook.xlsx.writeFile(excelPath);

   
    res.download(excelPath, 'sales-report.xlsx');
  } else {
    res.status(400).send('Invalid format. Use ?format=pdf or ?format=excel.');
  }
};

module.exports = {
    downloadReport,
}