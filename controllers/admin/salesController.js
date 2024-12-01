const fs = require('fs');
const path = require('path');
const ExcelJs = require('exceljs');
const PDFDocument = require('pdfkit');
const moment = require('moment');

// const getSalesReport = async(req,res)=>{

// }

// const filterOrders = async(req,res)=>{

//   if(req.session.admin){
//     try {

//       const {filter} = req.query;
//       let filterCriteria = {};

//       if(filter == 'today'){
//         const startOfDay = moment().startOf('day').toDate();
//         const endOfDay = moment().endOf('day').toDate();
//         filterCriteria.orderDate = {$gte: startOfDay, $lte : endOfDay};
//       }else if(filter == 'thisWeek'){
//         const startOfWeek = moment().startOf('week').toDate();
//         const endOfWeek = moment().endOf('week').toDate();
//         filterCriteria.orderDate = {$gte : startOfWeek, $lte : endOfWeek};
//       }else if(filter == 'lastMonth'){
//         const startOfLastMonth = moment().subtract(1,'month').startOf('month').toDate();
//         const endOfLastMonth = moment().subtract(1,'month').endOf('month').toDate();
//         filterCriteria.orderDate = {$gte : startOfLastMonth, $lte : endOfLastMonth};
//       }
      
//     } catch (error) {
      
//     }
//   }

// }

const downloadReport = async (req, res) => {
  const format = req.query.format;
  const filter = req.query.filter || 'all'

  // Filter the salesData based on the filter (e.g., "today", "thisWeek", "lastMonth")
  let filteredSalesData = salesData;
  const currentDate = new Date();

  if (filter === 'today') {
      filteredSalesData = salesData.filter((sale) => {
          const saleDate = new Date(sale.date);
          return (
              saleDate.getFullYear() === currentDate.getFullYear() &&
              saleDate.getMonth() === currentDate.getMonth() &&
              saleDate.getDate() === currentDate.getDate()
          );
      });
  } else if (filter === 'thisWeek') {
      const weekStart = new Date(
          currentDate.setDate(currentDate.getDate() - currentDate.getDay())
      );
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      filteredSalesData = salesData.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= weekStart && saleDate <= weekEnd;
      });
  } else if (filter === 'lastMonth') {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      filteredSalesData = salesData.filter((sale) => {
          const saleDate = new Date(sale.date);
          return (
              saleDate.getFullYear() === lastMonth.getFullYear() &&
              saleDate.getMonth() === lastMonth.getMonth()
          );
      });
  }

  if (format === 'pdf') {
      const pdfPath = path.join(__dirname, '../public/reports/sales-report.pdf');
      const pdfDoc = new PDFDocument();

      pdfDoc.pipe(fs.createWriteStream(pdfPath));

      pdfDoc.fontSize(18).text('Sales Report', { align: 'center' }).moveDown(2);
      filteredSalesData.forEach((sale, index) => {
          pdfDoc
              .fontSize(12)
              .text(
                  `${index + 1}. Order ID: ${sale.orderId}, Billing Name: ${sale.billingName}, Total: $${sale.total}, Status: ${sale.paymentStatus}`,
                  { align: 'left' }
              );
      });

      pdfDoc.end();

      res.download(pdfPath, 'sales-report.pdf');
  } else if (format === 'excel') {
      const workbook = new ExcelJs.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');

      worksheet.addRow([
          'Order ID',
          'Billing Name',
          'Date',
          'Total',
          'Payment Status',
          'Payment Method',
      ]);

      filteredSalesData.forEach((sale) => {
          worksheet.addRow([
              sale.orderId,
              sale.billingName,
              sale.date,
              sale.total,
              sale.paymentStatus,
              sale.paymentMethod,
          ]);
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