const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken();

  // Convert process.env.JWT_Expires to days and create a Date object
  const expirationDays = parseInt(process.env.JWT_Expires);
  const expirationTime = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

  const options = {
    expires: expirationTime,
    httpOnly: true,
    secure: true, // Set to true if using HTTPS
    sameSite: 'strict',
  };

  // Set the token as a cookie in the response
  res.cookie('token', token, options);

  res
    .status(statusCode)
    .json({
      success: true,
      login: user,
      token,
    });
};

module.exports = sendToken;
