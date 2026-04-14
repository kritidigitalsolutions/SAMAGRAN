  import { useEffect, useState } from "react";
  import API from "../api/axios";
  import "./Items.css";

  function ImageSlider({ images = [] }) {
    const [idx, setIdx] = useState(0);

    if (!images.length) return null;

    const next = () => setIdx((p) => (p + 1) % images.length);
    const prev = () => setIdx((p) => (p - 1 + images.length) % images.length);

    return (
      <div className="slider">
        <img src={`http://localhost:8000/${images[idx]}`} alt="" />

        {images.length > 1 && (
          <>
            <button type="button" className="nav prev" onClick={prev}>‹</button>
            <button type="button" className="nav next" onClick={next}>›</button>

            <div className="dots">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={i === idx ? "dot active" : "dot"}
                  onClick={() => setIdx(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  export default function Items() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
      const fetchItems = async () => {
        const res = await API.get("/items");
        setProducts(res.data.data.products || []);
      };
      fetchItems();
    }, []);

    return (
      <div className="items-page">
        <h2 className="items-title">Items</h2>

        <div className="items-grid">
          {products.map((p) => (
            <div key={p._id} className="item-card">
              {/* IMAGE SLIDER */}
              <ImageSlider images={p.images || p.media?.image || p.media?.Images || []} />

              {/* CONTENT */}
              <div className="item-body">
                <h3>{p.title}</h3>

                <p className="price">
                  ₹{p.pricing?.price}
                  {p.pricing?.mrp && (
                    <span> ₹{p.pricing.mrp}</span>
                  )}
                </p>

                <p className="category">{p.category?.name}</p>

                {p.isRecommended && (
                  <span className="badge">Recommended</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

