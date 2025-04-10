import jwt from 'jsonwebtoken'
import { User } from '../models/User.js';

export const isAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
  
      if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(403).json({ message: "Please Login" });
  
      const token = authHeader.split(" ")[1];
  
      const decodeData = jwt.verify(token, process.env.Jwt_Sec);
  
      req.user = await User.findById(decodeData._id);
  
      next();
    } catch (error) {
      res.status(500).json({
        message: "Login First",
      });
    }
  };
  
  

export const isAdmin = (req,res,next)=> {
    try{
        if(req.user.role !== "admin")
            return res.status(403).json({
        message: "You are not admin",
    });
    next();
    }
    catch(error){
        res.status(500).json({
            message:error.message,
        });
    }
};


