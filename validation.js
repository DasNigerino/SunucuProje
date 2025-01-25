const Joi = require('joi');
const APIError =require("../utils/errors")
const registerSchema = Joi.object({
  adi: Joi.string().min(3).max(30).required(),
  soyadi: Joi.string().min(3).max(30).required(),
  eposta: Joi.string().email().required(),
  sifre: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  eposta: Joi.string().email().required(),
  sifre: Joi.string().min(6).required()
});

module.exports = {
  registerSchema,
  loginSchema
};