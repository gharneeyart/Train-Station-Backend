const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  // Cookie options
  const options = {
    httpOnly: true, // Prevents client-side access
    secure: process.env.NODE_ENV === "production", // Ensures secure cookies in production
    sameSite: "strict", // Prevents CSRF attacks
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  };

  // Set cookie with token
  res
    .status(statusCode)
    .cookie("token", token, options) // Set cookie
    .json({
      success: true,
      token: token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
};

module.exports = sendTokenResponse;
