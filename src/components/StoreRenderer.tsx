import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Quotes } from '@phosphor-icons/react';
import type { Layout, Product, Section, Store } from '../lib/types';
import { money, priceOf, safeImage, stockOf } from '../lib/utils';
export function ProductCard({
  product,
  slug,
  preview = false,
}: {
  product: Product;
  slug: string;
  preview?: boolean;
}) {
  return (
    <Link
      className="shop-product"
      to={preview ? '#' : `/toko/${slug}/produk/${product.id}`}
      onClick={preview ? (e) => e.preventDefault() : undefined}
    >
      <div className="shop-product-image">
        <img src={safeImage(product.images[0] || '')} alt={product.name} loading="lazy" />
        {!stockOf(product) && <span className="out-of-stock">Habis</span>}
        <span className="shop-product-action">
          <ShoppingBag size={21} />
        </span>
      </div>
      <small>{product.category}</small>
      <h3>{product.name}</h3>
      <strong>{money(priceOf(product))}</strong>
    </Link>
  );
}
export function SectionView({
  section,
  store,
  products,
  preview = false,
}: {
  section: Section;
  store: Store;
  products: Product[];
  preview?: boolean;
}) {
  switch (section.type) {
    case 'hero':
      return (
        <section className="shop-hero">
          <img src={safeImage(section.image)} alt="Koleksi pilihan toko" />
          <div className="shop-hero-content">
            <span>DIKURASI UNTUKMU</span>
            <h1>{section.title}</h1>
            <p>{section.text}</p>
            <Link
              className="btn shop-btn"
              to={preview ? '#' : `/toko/${store.slug}/katalog`}
              onClick={preview ? (e) => e.preventDefault() : undefined}
            >
              Jelajahi koleksi <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      );
    case 'products':
      return (
        <section className="shop-section">
          <div className="shop-section-heading">
            <div>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </div>
            <Link
              to={preview ? '#' : `/toko/${store.slug}/katalog`}
              onClick={preview ? (e) => e.preventDefault() : undefined}
            >
              Semua produk <ArrowRight size={17} />
            </Link>
          </div>
          <div className="shop-products">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} slug={store.slug} preview={preview} />
            ))}
          </div>
          {!products.length && (
            <div className="empty">
              <ShoppingBag size={32} />
              <p>Produk pilihan akan hadir di sini.</p>
            </div>
          )}
        </section>
      );
    case 'text':
      return (
        <section className="shop-story">
          <span>TENTANG KAMI</span>
          <h2>{section.title}</h2>
          <p>{section.text}</p>
        </section>
      );
    case 'testimonial':
      return (
        <section className="shop-quote">
          <Quotes size={34} />
          <blockquote>
            {section.text || 'Tambahkan kutipan pelanggan yang sudah memberikan izin.'}
          </blockquote>
          <p>{section.title}</p>
        </section>
      );
  }
}
export function StoreRenderer({
  layout,
  store,
  products,
  preview = false,
}: {
  layout: Layout;
  store: Store;
  products: Product[];
  preview?: boolean;
}) {
  return (
    <div
      className={`store-renderer font-${layout.font}`}
      style={{ '--shop-color': layout.color } as React.CSSProperties}
    >
      {layout.sections.map((section) => (
        <SectionView
          section={section}
          store={store}
          products={products}
          preview={preview}
          key={section.id}
        />
      ))}
    </div>
  );
}
