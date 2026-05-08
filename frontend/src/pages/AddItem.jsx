import { useState } from "react";
import API from "../api/axios";
import "./AddItem.css";

export default function AddItem() {
  const [form, setForm] = useState({
    title: "",
    price: "",
    mrp: "",
    discountType: "percent",
    discountValue: "",
    discountIsActive: false,
    discountStartsAt: "",
    discountExpiresAt: "",
    categoryName: "",
    subCategoryName: "",
    quantity: "",
    tags: "",
    isRecommended: false,
  });

  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);

  // handle text inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // handle multiple images
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    setImages(files);

    // preview images
    const previewUrls = files.map((file) => URL.createObjectURL(file));
    setPreview(previewUrls);
  };

  // submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      // append text fields
      Object.keys(form).forEach((key) => {
        formData.append(key, form[key]);
      });

      // append multiple images
      images.forEach((img) => {
        formData.append("images", img); // MUST MATCH BACKEND
      });

      await API.post("/items/add", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Item added successfully");

    } catch (err) {
      console.error(err);
      alert("Error uploading item");
    }
  };
  const handleRemoveImage = (index) => {
  const newImages = images.filter((_, i) => i !== index);
  const newPreview = preview.filter((_, i) => i !== index);

  setImages(newImages);
  setPreview(newPreview);
};

  return (
  <form className="add-item-form" onSubmit={handleSubmit}>

  <div className="form-group">
    <label>Title</label>
    <input name="title" onChange={handleChange} />
  </div>

  <div className="form-group">
    <label>Category</label>
    <input name="categoryName" onChange={handleChange} />
  </div>

  <div className="form-group">
    <label>Sub Category</label>
    <input name="subCategoryName" onChange={handleChange} />
  </div>

  <div className="form-group">
    <label>Price</label>
    <input type="number" name="price" onChange={handleChange} />
  </div>

  <div className="form-group">
    <label>MRP</label>
    <input type="number" name="mrp" onChange={handleChange} />
  </div>

  <div className="form-group">
    <label>Discount Type</label>
    <select name="discountType" onChange={handleChange}>
      <option value="percent">Percent</option>
      <option value="flat">Flat</option>
    </select>
  </div>

  <div className="form-group">
    <label>Discount Value</label>
    <input type="number" name="discountValue" onChange={handleChange} />
  </div>

  <div className="form-group">
    <label>Discount Start</label>
    <input type="date" name="discountStartsAt" onChange={handleChange} />
  </div>

  <div className="form-group">
    <label>Discount End</label>
    <input type="date" name="discountExpiresAt" onChange={handleChange} />
  </div>

  <div className="form-group">
    <label>Stock</label>
    <input type="number" name="quantity" onChange={handleChange} />
  </div>

  <div className="form-group">
    <label>Tags</label>
    <input name="tags" onChange={handleChange} />
  </div>

  <div className="form-group full-width checkbox">
    <label>
      <input type="checkbox" name="isRecommended" onChange={handleChange} />
      Recommended
    </label>
  </div>

  <div className="form-group full-width checkbox">
    <label>
      <input type="checkbox" name="discountIsActive" onChange={handleChange} />
      Discount Active
    </label>
  </div>

  <div className="form-group full-width">
    <label>Images</label>
    <input type="file" accept="image/*" multiple onChange={handleImageChange} />
    <p className="helper-text">Images should be JPG/PNG/WebP, max 5 files, up to 2 MB each.</p>
  </div>

  <div className="preview-container full-width">
    {preview.map((img, i) => (
      <div key={i} className="preview-box">
        <img src={img} className="preview-image" />
        <button type="button" className="remove-btn" onClick={() => handleRemoveImage(i)}>✕</button>
      </div>
    ))}
  </div>

  <button className="add-btn full-width">Add Item</button>

</form>
);
}
