import mongoose from "mongoose";

const aboutUsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            default: "About Us"
        },
        content: {
            type: String,
            required: true
        }

    }, {timestamps: true}
);


export default mongoose.model("AboutUs", aboutUsSchema)