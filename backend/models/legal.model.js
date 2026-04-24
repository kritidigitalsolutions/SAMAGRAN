import mongoose from "mongoose";

const legalSchema = new mongoose.Schema({
    type:{
        type: String,
        required: true,
        unique: true
    },

    content: {
        type: String,
        required: true
    },

}, { timestamps: true }
);

export default mongoose.model("Legal", legalSchema);