const fs = require('fs');
const path = require('path');
const ExcelJs = require('exceljs');
const PDFDocument = require('pdfkit');
const Order = require('../../models/orderSchema');
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

const generateSalesReport = async (req, res) => {
    try {
        const filter = req.query.filter;
        const filterCriteria = { status: "Completed" };

        // Apply the filter criteria
        if (filter === "today") {
            const startOfDay = moment().startOf('day').toDate();
            const endOfDay = moment().endOf('day').toDate();
            filterCriteria.orderDate = { $gte: startOfDay, $lte: endOfDay };
        } else if (filter === "thisWeek") {
            const startOfWeek = moment().startOf('week').toDate();
            const endOfWeek = moment().endOf('week').toDate();
            filterCriteria.orderDate = { $gte: startOfWeek, $lte: endOfWeek };
        } else if (filter === "lastMonth") {
            const startOfLastMonth = moment().subtract(1, 'month').startOf('month').toDate();
            const endOfLastMonth = moment().subtract(1, 'month').endOf('month').toDate();
            filterCriteria.orderDate = { $gte: startOfLastMonth, $lte: endOfLastMonth };
        } else if (filter === 'yearly') {
            const startOfYear = moment().startOf('year').toDate();
            const endOfYear = moment().endOf('year').toDate();
            filterCriteria.orderDate = { $gte: startOfYear, $lte: endOfYear };
        }

        // Fetch filtered data
        const completedOrders = await Order.aggregate([
            { $match: filterCriteria },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    orderId: 1,
                    orderDate: 1,
                    totalAmount: 1,
                    status: 1,
                    paymentMethod: 1,
                    productName: "$productDetails.productName"
                }
            },
        ]);

        // Send filtered data back to the client
        res.json({ completedOrders });
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).send('Error generating sales report');
    }
};

const updateChartData = async(req,res)=>{
    try {
        const filter = req.params.filter;  // Get the filter from URL parameter
        console.log('checking the chart dat : backend',filter);
        const filterCriteria = { status: "Completed" };  // Filter for only completed orders

        // Initialize a variable to hold the sales data for the chart
        let salesData = [];

        // Apply the filter criteria based on the selected filter
        if (filter === "today") {
            const startOfDay = moment().startOf('day').toDate();
            const endOfDay = moment().endOf('day').toDate();
            filterCriteria.orderDate = { $gte: startOfDay, $lte: endOfDay };
        } else if (filter === "weekly") {
            const startOfWeek = moment().startOf('week').toDate();
            const endOfWeek = moment().endOf('week').toDate();
            filterCriteria.orderDate = { $gte: startOfWeek, $lte: endOfWeek };
        } else if (filter === "monthly") {
            const startOfMonth = moment().startOf('month').toDate();
            const endOfMonth = moment().endOf('month').toDate();
            filterCriteria.orderDate = { $gte: startOfMonth, $lte: endOfMonth };
        } else if (filter === "yearly") {
            const startOfYear = moment().startOf('year').toDate();
            const endOfYear = moment().endOf('year').toDate();
            filterCriteria.orderDate = { $gte: startOfYear, $lte: endOfYear };
        }

        // Fetch sales data based on filter criteria
        const orders = await Order.aggregate([
            { $match: filterCriteria },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: {
                        day: { $dayOfYear: "$orderDate" },
                        month: { $month: "$orderDate" },
                        year: { $year: "$orderDate" },
                    },
                    totalSales: { $sum: "$totalAmount" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            }
        ]);

        console.log('checking the orders updatechart: ',orders);

        // Prepare the data for the chart
        salesData = orders.map(order => ({
            date: `${order._id.month}/${order._id.day}/${order._id.year}`,
            totalSales: order.totalSales
        }));

        console.log('checking the sales data backend: ',salesData);

        // Send the sales data to the client
        res.json({ salesData });
    } catch (error) {
        console.error('Error updating chart data:', error);
        res.status(500).send('Error updating chart data');
    }
}



module.exports = {
    downloadReport,
    generateSalesReport,
    updateChartData,
}