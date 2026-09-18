export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const successResponse = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

export const errorResponse = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message } });
