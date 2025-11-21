const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ReceiptGenerator {
  constructor() {
    // Ensure receipts directory exists
    this.receiptsDir = path.join(__dirname, '../receipts');
    if (!fs.existsSync(this.receiptsDir)) {
      fs.mkdirSync(this.receiptsDir, { recursive: true });
    }
  }

  async generateReceipt(receiptData) {
    return new Promise((resolve, reject) => {
      try {
        const {
          customer,
          orders,
          receiptDate,
          receiptNumber,
          totalAmount,
          totalDiscount,
          grandTotal
        } = receiptData;

        // Create PDF document
        const doc = new PDFDocument({ 
          size: 'A4',
          margin: 50,
          info: {
            Title: `Receipt ${receiptNumber}`,
            Author: 'Luku Safi Laundromat',
            Subject: `Receipt for ${customer.name}`,
            Creator: 'Luku Safi Laundromat'
          }
        });

        // Generate unique filename
        const filename = `receipt_${receiptNumber}_${Date.now()}.pdf`;
        const filepath = path.join(this.receiptsDir, filename);
        
        // Pipe to file
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        this.addHeader(doc);
        
        // Customer Info
        this.addCustomerInfo(doc, customer, receiptDate, receiptNumber);
        
        // Order Details Table
        this.addOrdersTable(doc, orders);
        
        // Totals
        this.addTotals(doc, totalAmount, totalDiscount, grandTotal);
        
        // Footer
        this.addFooter(doc);

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          resolve({
            success: true,
            filename,
            filepath,
            receiptNumber
          });
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(doc) {
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('Luku Safi Laundromat', 50, 50, { align: 'center' });
    
    doc.fontSize(12)
       .font('Helvetica')
       .text('Professional Laundry Services', 50, 80, { align: 'center' })
       .text('Phone: +254 708 718 595 | Email: lukusafilaundromat@gmail.com', 50, 95, { align: 'center' });

    // Divider line
    doc.moveTo(50, 120)
       .lineTo(545, 120)
       .stroke();

    return doc;
  }

  addCustomerInfo(doc, customer, receiptDate, receiptNumber) {
    const startY = 140;
    
    // Receipt title
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('RECEIPT', 50, startY);

    // Receipt details - left side
    doc.fontSize(11)
       .font('Helvetica')
       .text(`Receipt #: ${receiptNumber}`, 50, startY + 30)
       .text(`Date: ${new Date(receiptDate).toLocaleDateString()}`, 50, startY + 45)
       .text(`Time: ${new Date(receiptDate).toLocaleTimeString()}`, 50, startY + 60);

    // Customer details - right side
    doc.font('Helvetica-Bold')
       .text('CUSTOMER DETAILS', 350, startY + 30)
       .font('Helvetica')
       .text(`Name: ${customer.name}`, 350, startY + 45);
    
    if (customer.phone) {
      doc.text(`Phone: ${customer.phone}`, 350, startY + 60);
    }
    
    if (customer.email) {
      doc.text(`Email: ${customer.email}`, 350, startY + 75);
    }

    return doc;
  }

  addOrdersTable(doc, orders) {
    const startY = 240;
    const tableTop = startY;
    const itemHeight = 20;
    
    // Table headers
    doc.fontSize(11)
       .font('Helvetica-Bold');
    
    this.drawTableRow(doc, tableTop, 
      'Service', 'Weight/Items', 'Unit Price', 'Discount', 'Total'
    );

    // Header underline
    doc.moveTo(50, tableTop + 15)
       .lineTo(545, tableTop + 15)
       .stroke();

    // Table rows
    doc.font('Helvetica')
       .fontSize(10);

    let currentY = tableTop + 25;
    
    orders.forEach((order, index) => {
      const weightItems = this.formatWeightItems(order);
      const unitPrice = this.formatCurrency(order.subtotal);
      const discount = order.discount_amount > 0 ? `-${this.formatCurrency(order.discount_amount)}` : '-';
      const total = this.formatCurrency(order.total_amount);

      this.drawTableRow(doc, currentY,
        order.service_type,
        weightItems,
        unitPrice,
        discount,
        total
      );

      currentY += itemHeight;

      // Add transaction code if available
      if (order.transaction_code) {
        doc.fontSize(9)
           .fillColor('#666666')
           .text(`Ref: ${order.transaction_code}`, 50, currentY - 5);
        doc.fillColor('#000000')
           .fontSize(10);
      }

      // Add notes if available
      if (order.notes) {
        doc.fontSize(9)
           .fillColor('#666666')
           .text(`Note: ${order.notes}`, 50, currentY);
        currentY += 15;
        doc.fillColor('#000000')
           .fontSize(10);
      }
    });

    return currentY;
  }

  drawTableRow(doc, y, service, weightItems, unitPrice, discount, total) {
    doc.text(service, 50, y, { width: 150, ellipsis: true })
       .text(weightItems, 210, y, { width: 80, align: 'center' })
       .text(unitPrice, 300, y, { width: 80, align: 'right' })
       .text(discount, 390, y, { width: 70, align: 'right' })
       .text(total, 470, y, { width: 75, align: 'right' });
  }

  addTotals(doc, totalAmount, totalDiscount, grandTotal) {
    const startY = 500;
    
    // Totals section
    doc.moveTo(350, startY)
       .lineTo(545, startY)
       .stroke();

    doc.fontSize(11)
       .font('Helvetica')
       .text('Subtotal:', 400, startY + 10, { align: 'left' })
       .text(this.formatCurrency(totalAmount), 470, startY + 10, { align: 'right' });

    if (totalDiscount > 0) {
      doc.text('Total Discount:', 400, startY + 25, { align: 'left' })
         .text(`-${this.formatCurrency(totalDiscount)}`, 470, startY + 25, { align: 'right' });
    }

    // Grand total
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('TOTAL:', 400, startY + 45, { align: 'left' })
       .text(this.formatCurrency(grandTotal), 470, startY + 45, { align: 'right' });

    // Total line
    doc.moveTo(350, startY + 65)
       .lineTo(545, startY + 65)
       .stroke();

    return doc;
  }

  addFooter(doc) {
    const footerY = 700;
    
    doc.fontSize(10)
       .font('Helvetica')
       .text('Thank you for choosing our services!', 50, footerY, { align: 'center' })
       .text('For any queries, please contact us at the above details.', 50, footerY + 15, { align: 'center' });

    // Footer line
    doc.moveTo(50, footerY - 10)
       .lineTo(545, footerY - 10)
       .stroke();

    return doc;
  }

  formatWeightItems(order) {
    const parts = [];
    if (order.weight > 0) {
      parts.push(`${order.weight}kg`);
    }
    if (order.items > 0) {
      parts.push(`${order.items} items`);
    }
    return parts.join(', ') || '-';
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  // Clean up old receipt files (call periodically)
  cleanupOldReceipts(daysOld = 30) {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    fs.readdir(this.receiptsDir, (err, files) => {
      if (err) return;
      
      files.forEach(file => {
        const filepath = path.join(this.receiptsDir, file);
        fs.stat(filepath, (err, stats) => {
          if (err) return;
          
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlink(filepath, () => {});
          }
        });
      });
    });
  }
}

module.exports = ReceiptGenerator;