const Order = require("../modals/orderModal");
const Product = require("../modals/productModal");
const ErrorHander = require("../utils/errorHandler");
const sendEmail = require("../utils/mailSend")
const user = require("../modals/userModal");
const path = require("path")
const PDFDocument = require('pdfkit');
const fs = require('fs');
//=====Catch Async error
const catchAsyncErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};



function generateInvoiceNumber() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 90000000) + 10000000; // Generate a random 8-digit number
  return `${timestamp}_${random}`;
}

exports.newOrder = catchAsyncErrors(async (req, res, next) => {
  const orderNumber = generateInvoiceNumber();
  const {
    shippingInfo,
    orderItems,
    paymentInfo,
    userInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  const order = await Order.create({
    shippingInfo,
    orderItems,
    paymentInfo,
    userInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    invoiceNumber: orderNumber,
    paidAt: Date.now(),
  });

  const invoiceName = `invoice_${order._id}.pdf`;
  const invoicePath = path.join(__dirname, '..', 'invoices', invoiceName);

  // Ensure directory exists
  const invoiceDir = path.dirname(invoicePath);
  if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir, { recursive: true });
  }

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(invoicePath));

  // Add content to the PDF
  doc.font('Helvetica-Bold').fontSize(18).text('Invoice', { align: 'center' });

  // Add order details
  doc.font('Helvetica').fontSize(20).text(`Invoice Number: ${order.invoiceNumber}`);

  doc.font('Helvetica').fontSize(12).text(`Order ID: ${order._id}`);
  doc.text(`Order Date: ${order.paidAt.toDateString()}`);
  doc.text(`Shipping Address: ${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.country}`);
  doc.moveDown();

  // Add order items
  doc.font('Helvetica-Bold').fontSize(14).text('Order Items:');
  orderItems.forEach((item) => {
    doc.font('Helvetica').fontSize(12).text(`${item.name} - Quantity: ${item.quantity}, Price: $${item.price}`);
  });
  doc.moveDown();
  //add user info here
  doc.font('Helvetica-Bold').fontSize(14).text('User Details:');
  doc.font('Helvetica').fontSize(12).text(`user ID: ${userInfo.userId}`);
  doc.text(`email: ${userInfo.UserEmail}`);
  // Add payment details
  doc.font('Helvetica-Bold').fontSize(14).text('Payment Details:');
  doc.font('Helvetica').fontSize(12).text(`Payment ID: ${paymentInfo.id}`);
  doc.text(`Payment Status: ${paymentInfo.status}`);
  doc.moveDown();

  // Add pricing details
  doc.font('Helvetica-Bold').fontSize(14).text('Pricing Details:');
  doc.font('Helvetica').fontSize(12).text(`Items Price: Rs${itemsPrice}`);
  doc.text(`Tax Price: Rs${taxPrice}`);
  doc.text(`Shipping Price: Rs${shippingPrice}`);
  doc.text(`Total Price: Rs${totalPrice}`);

  doc.end();

  // Update order with invoicePath
  order.invoicePath = invoicePath;
  await order.save();

  console.log(order)
  // Return Response with Invoice Link
  res.status(201).json({
    success: true,
    order,
    invoiceLink: invoicePath,
  });
});
// get singleorder Details by order id


exports.singleorder = catchAsyncErrors(async (req, res, next) => {
  const params = req.params.id;
  const order = await Order.findById(params).populate("user", "new email");
  if (!order) {
    return next(new ErrorHander("Order not found with this Id", 404));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

//get logged user orders
exports.myOrder = catchAsyncErrors(async (req, res, next) => {

  const orders = await Order.find({ user: req.user._id });

  res.status(200).json({
    success: true,
    orders,
  });
});
//get All order by admin
exports.myOrderEmail = catchAsyncErrors(async (req, res, next) => {
  const userEmail = req.params.phoneNo;
  const orders = await Order.find({ 'shippingInfo.email': userEmail }); // Change to use the email field in shippingInfo

  res.status(200).json({
    success: true,
    orders,
  });
});
exports.getOrdersByPhoneNumber = catchAsyncErrors(async (req, res, next) => {
  const phoneNumber = req.params.PhoneNo; // Use correct case for parameter name

  console.log('Received phone number:', phoneNumber);

  if (!isValidPhoneNumber(phoneNumber)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format.',
    });
  }

  try {
    const orders = await Order.find({ 'shippingInfo.phoneNo': phoneNumber });
    const numberOfOrders = orders.length;
    if (numberOfOrders === 0) {
      return res.status(404).json({
        success: true,
        message: 'No orders found for the provided phone number.',
      });
    }

    res.status(200).json({
      success: true,
      numberOfOrders,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching orders.',
    });
  }
});

function isValidPhoneNumber(phoneNumber) {
  // Use a regular expression to validate a 10-digit phone number
  // Assumes a valid phone number is a 10-digit number with no additional characters
  return /^\d{10}$/.test(phoneNumber);
}

exports.allOrdersAdmin= catchAsyncErrors(async(req,res,next)=>{

    const order = await Order.find()
    let totalAmount = 0;

    order.forEach((order) => {
      totalAmount += order.totalPrice;
    });
  
    res.status(200).json({
        success: true,
        totalAmount,
        order
      });

})

// Function to change order status
exports.changeStatus = catchAsyncErrors(async (req, res, next) => {
    const orderId = req.params.id;
  
    // Find the order by ID
    const order = await Order.findById(orderId);
  
    // Check if the order exists
    if (!order) {
      return next(new ErrorHander('Order not found with this ID', 404));
    }
  
    // Check if the order is already delivered
    if (order.orderStatus === 'Delivered') {
      return next(new ErrorHander('You have already delivered this order', 201));
    }
  

    order.orderStatus = req.body.status;
  
    // Set deliveredAt if order status is "Delivered"
    if (req.body.status === 'Delivered') {
      order.deliveredAt = Date.now();
    }
  
    // Save the updated order
    await order.save({ validateBeforeSave: false });
  
    res.status(200).json({
      success: true,
      message: "Order Delivered successfully",

    });
  });
  
  exports.deleteOrder = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
  
    if (!order) {
      return next(new ErrorHander("Order not found with this Id", 404));
    }
  
    // Check if the order status is "Shipped"
    if (order.orderStatus === "Shipped") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel the order as it has already been delivered.",
      });
    }
  
    await order.deleteOne();
  
    res.status(200).json({
      success: true,
      message: "Order canceled successfully",
    });
  
  })

  exports.deleteProcessingOrders = catchAsyncErrors(async (req, res) => {
    const deletedOrders = await Order.deleteMany({ orderStatus: 'Processing' });
  
    if (deletedOrders.deletedCount > 0) {
      return res.status(200).json({
        success: true,
        message: 'Processing orders deleted successfully',
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No processing orders found',
      });
    }
  });
  exports.deleteOrdersWithNullItems = catchAsyncErrors(async (req, res) => {
    const deletedOrders = await Order.deleteMany({ orderItems: { $in: [null, []] } });
  
    if (deletedOrders.deletedCount > 0) {
      return res.status(200).json({
        success: true,
        message: 'Orders with null or empty items deleted successfully',
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No orders with null or empty items found',
      });
    }
  });
  exports.deleteOrdersWithZeroTotalPrice = catchAsyncErrors(async (req, res) => {
    const deletedOrders = await Order.deleteMany({ totalPrice: 0 });
  
    if (deletedOrders.deletedCount > 0) {
      return res.status(200).json({
        success: true,
        message: 'Orders with zero total price deleted successfully',
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No orders with zero total price found',
      });
    }
  });
  exports.totalPaymentAmount = catchAsyncErrors(async (req, res) => {
    // Find all orders with the status 'delivered'
    const deliveredOrders = await Order.find({ status: 'delivered' });
  
    // Calculate the total order amount for delivered orders
    let totalAmount = 0;
    for (const order of deliveredOrders) {
      totalAmount += order.totalAmount; // Assuming totalPrice is the field storing the order amount
    }
  
    res.status(200).json({
      success: true,
      totalAmount,
    });
  });

  
  
  exports.deleteAllOrdersAll = catchAsyncErrors(async (req, res) => {
    const deletedOrders = await Order.deleteMany({});
    
    if (deletedOrders.deletedCount > 0) {
      return res.status(200).json({
        success: true,
        message: 'All orders deleted successfully',
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No orders found to delete',
      });
    }
  });
  