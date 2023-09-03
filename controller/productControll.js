const products = require("../modals/productModal");
const ApiFeature = require("../utils/apiFeaturess");
const ErrorHander = require("../utils/errorHandler");

const catchAsyncErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
//  create products  for admin=========================================

exports.createProduct = catchAsyncErrors(async (req, res, next) => {
  try {
    const product = await products.create(req.body);

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    // Handle any errors that occur during product creation
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product.",
    });
  }
});

//  create products  for admin=========================================

exports.getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const resultPerPage = 150; // Change this to 8 images per page
  const apifeature = new ApiFeature(products.find(req.query), req.query)
    .search()
    .filter()
    .pagination(resultPerPage);

  try {
    const allProducts = await apifeature.query; // Query products from the database

    res.status(200).json({
      success: true,
      data: allProducts,
    });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products.",
      error: error.message,
    });
  }
});

// ======================Update product for admin

exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;

    // Find the product by ID and update it with the new data
    const updatedProduct = await products.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedProduct,
    });
    console.log(updatedProduct);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update product.",
      error: error.message,
    });
  }
});

//   ===========================Delete products by id
exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await products.findById(req.params.id);

  if (!product) {
    return next(new ErrorHander("Product not found", 404));
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: "Product Delete Successfully",
  });
});

//  ===========================single  products by id

exports.gettSingleProducts = catchAsyncErrors(async (req, res, next) => {
  const product = await products.findById(req.params.id);

  if (!product) {
    return res.status(500).json({
      success: false,
      message: "No Product Found",
    });
  }

  res.status(200).json({
    success: true,
    product,
  });
});
