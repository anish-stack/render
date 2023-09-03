const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  shippingInfo: {
    address: {
      type: String,
  
    },
    city: {
      type: String,
  
    },

    state: {
      type: String,
  
    },

    country: {
      type: String,
  
    },
    pinCode: {
      type: Number,
  
    },
    phoneNo: {
      type: Number,
  
    },

  
  },
  orderItems: [
    {
      name: {
        type: String,
    
      },
      price: {
        type: Number,
    
      },
      quantity: {
        type: Number,
    
      },
      image: {
        type: String,
    
      },
      product: {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
    
      },
    },
  ],
  userInfo:[
    {
    userId:{
      type :String 
    },
    UserEmail:{
      type:String
    },

  }
  ],

  paymentInfo: {
    id: {
      type: String,
  
    },
    status: {
      type: String,
  
    },
  },
  paidAt: {
    type: Date,

  },
  itemsPrice: {
    type: Number,

    default: 0,
  },
  taxPrice: {
    type: Number,

    default: 0,
  },
  shippingPrice: {
    type: Number,

    default: 0,
  },
  totalPrice: {
    type: Number,

    default: 0,
  },
  orderStatus: {
    type: String,

    default: "Processing",
  },
  invoiceNumber: String,
  invoicePath: String,
    deliveredAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", orderSchema);