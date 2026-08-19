import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import FormField from '../../components/common/FormField';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './ProductForm.module.css';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB — client-side guard only; backend re-validates too

export default function ProductForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);

  // Image state: existingImage = what's already saved on the product
  // (edit mode only); imageFile/imagePreviewUrl = a newly picked file not
  // yet uploaded. The field name synced with the backend is "image", not
  // "imageUrl" — confirmed contract.
  const [existingImage, setExistingImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [imageError, setImageError] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const requests = [api.get('/categories?all=true'), api.get('/suppliers?all=true')];
        if (isEditMode) requests.push(api.get(`/products/${id}`));

        const [categoriesRes, suppliersRes, productData] = await Promise.all(requests);
        if (!isMounted) return;

        setCategoryOptions(Array.isArray(categoriesRes?.data) ? categoriesRes.data : []);
        setSupplierOptions(Array.isArray(suppliersRes?.data) ? suppliersRes.data : []);

        if (isEditMode && productData) {
          setName(productData.name ?? '');
          setSku(productData.sku ?? '');
          setDescription(productData.description ?? '');
          setUnitPrice(productData.unitPrice != null ? String(productData.unitPrice) : '');
          setCategoryId(productData.categoryId ?? '');
          setSupplierId(productData.supplierId ?? '');
          setExistingImage(productData.image ?? null);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load this page.'));
        navigate('/products');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, navigate]);

  // Release the local object URL when it's replaced or the component unmounts.
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Only JPG, PNG, or WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Image must be 5MB or smaller.');
      return;
    }

    setImageError('');
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleCancelSelectedFile() {
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleRemoveExistingImage() {
    if (!isEditMode) return;
    const confirmed = window.confirm("Remove this product's image?");
    if (!confirmed) return;

    try {
      // NOTE: no dedicated DELETE endpoint is documented — this infers
      // that PATCH /products/:id with { image: null } clears it, based on
      // the JSON endpoint's stated ability to accept an image URL string
      // under "image". Not explicitly confirmed — verify with backend.
      await api.patch(`/products/${id}`, { image: null });
      setExistingImage(null);
      toast.success('Image removed.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove the image.'));
    }
  }

  async function uploadImage(productId, file) {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      // Deliberately NOT setting Content-Type here — the browser must
      // generate it (including the multipart boundary) itself. apiClient
      // needs to detect `body instanceof FormData` and skip both
      // JSON.stringify and its own Content-Type header for this to work.
      const response = await api.post(`/products/${productId}/image`, formData);
      const updatedImage = response?.image ?? response?.data?.image ?? null;
      setExistingImage(updatedImage);
      setImageFile(null);
      setImagePreviewUrl(null);
    } catch (err) {
      // The product itself already saved successfully at this point — this
      // is a distinct, separate failure, not a reason to say the whole save failed.
      toast.error(
        getErrorMessage(err, 'Product saved, but the image failed to upload. Try again from the edit page.'),
      );
    } finally {
      setIsUploadingImage(false);
    }
  }

  function validate() {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Product name is required.';
    if (!sku.trim()) nextErrors.sku = 'SKU is required.';
    if (!unitPrice.trim()) {
      nextErrors.unitPrice = 'Unit price is required.';
    } else if (Number.isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
      nextErrors.unitPrice = 'Unit price must be a valid non-negative number.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const payload = {
      name: name.trim(),
      sku: sku.trim(),
      description: description.trim() || undefined,
      unitPrice: Number(unitPrice),
      categoryId: categoryId || undefined,
      supplierId: supplierId || undefined,
    };

    try {
      let productId = id;
      if (isEditMode) {
        await api.patch(`/products/${id}`, payload);
        toast.success('Product updated.');
      } else {
        const created = await api.post('/products', payload);
        productId = created?.id ?? created?.data?.id;
        toast.success('Product created.');
      }

      if (imageFile && productId) {
        await uploadImage(productId, imageFile);
      }

      navigate('/products');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save this product.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading…</p>;
  }

  const displayedImage = imagePreviewUrl || existingImage;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{isEditMode ? 'Edit Product' : 'Add Product'}</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.imageGroup}>
          <span className={styles.imageLabel}>Product Image</span>

          <div className={styles.imagePreviewWrap}>
            {displayedImage ? (
              <img src={displayedImage} alt="" className={styles.imagePreview} />
            ) : (
              <div className={styles.imagePlaceholder}>
                <ImagePlus size={28} strokeWidth={1.5} aria-hidden="true" />
              </div>
            )}
          </div>

          <div className={styles.imageActions}>
            <button
              type="button"
              className={styles.imagePickButton}
              onClick={() => fileInputRef.current?.click()}
            >
              {displayedImage ? 'Change Image' : 'Upload Image'}
            </button>

            {imagePreviewUrl && (
              <button type="button" className={styles.imageRemoveButton} onClick={handleCancelSelectedFile}>
                Cancel
              </button>
            )}

            {!imagePreviewUrl && existingImage && isEditMode && (
              <button
                type="button"
                className={styles.imageRemoveButton}
                onClick={handleRemoveExistingImage}
              >
                Remove Image
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.hiddenFileInput}
            onChange={handleFileSelect}
            aria-label="Product image"
          />

          {imageError && <p className={styles.fieldError}>{imageError}</p>}
          {isUploadingImage && <p className={styles.status}>Uploading image…</p>}
        </div>

        <FormField
          id="product-name"
          name="name"
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoComplete="off"
        />
        <FormField
          id="product-sku"
          name="sku"
          label="SKU"
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          error={errors.sku}
          autoComplete="off"
        />
        <FormField
          id="product-unit-price"
          name="unitPrice"
          label="Unit Price"
          type="text"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          error={errors.unitPrice}
          autoComplete="off"
        />

        <div className={styles.textareaGroup}>
          <label className={styles.textareaLabel} htmlFor="product-description">
            Description
          </label>
          <textarea
            id="product-description"
            name="description"
            className={styles.textarea}
            rows={4}
            maxLength={500}
            placeholder="Optional — briefly describe this product"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <span className={styles.charCount}>{description.length}/500</span>
        </div>

        <div className={styles.selectGroup}>
          <label className={styles.selectLabel} htmlFor="product-category">
            Category
          </label>
          <select
            id="product-category"
            name="categoryId"
            className={styles.select}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">No category</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.selectGroup}>
          <label className={styles.selectLabel} htmlFor="product-supplier">
            Supplier
          </label>
          <select
            id="product-supplier"
            name="supplierId"
            className={styles.select}
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">No supplier</option>
            {supplierOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actionsRow}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/products')}>
            Cancel
          </button>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
