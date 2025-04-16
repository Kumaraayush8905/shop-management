// Firebase से आवश्यक सर्विसेज लोड करें
const { initializeApp } = window.firebase;
const { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot } = window.firebase.firestore;
const { getStorage, ref, uploadBytes, getDownloadURL } = window.firebase.storage;

// Firestore और Storage का इंस्टेंस
const db = getFirestore();
const storage = getStorage();

// प्रोडक्ट्स की लिस्ट (Firestore से लोड होगी)
let products = [];
let selectedPhoto = null;
let editSelectedPhoto = null;

// Firestore से प्रोडक्ट्स लोड करें (रियल-टाइम)
function loadProducts() {
    const tableBody = document.getElementById('productTable').querySelector('tbody');
    tableBody.innerHTML = '';
    onSnapshot(collection(db, "products"), (snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            products.push({ id: doc.id, no: data.no, category: data.category, serial: data.serial, name: data.name, size: data.size, minPrice: data.minPrice, price: data.price, photo: data.photo, details: data.details });
        });
        products.sort((a, b) => a.no - b.no);
        products.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="No.">${product.no}</td>
                <td data-label="Category">${product.category}</td>
                <td data-label="Serial Number">${product.serial}</td>
                <td data-label="Product Name">${product.name}</td>
                <td data-label="Size">${product.size}</td>
                <td data-label="Minimum Price">${product.minPrice}</td>
                <td data-label="Price">${product.price}</td>
                <td data-label="Photo">
                    ${product.photo === '--' ? '--' : `<button class="view-photo" onclick="viewPhoto('${product.photo}')">View Photo</button>`}
                </td>
                <td data-label="Details">${product.details}</td>
                <td data-label="Action">
                    <button class="edit" onclick="editProduct(${index})">Edit</button>
                    <button class="delete" onclick="confirmDelete('${product.id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }, (error) => {
        console.error("Error loading products:", error);
    });
}

// सर्च फीचर
document.getElementById('searchInput').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.serial.toLowerCase().includes(searchTerm)
    );
    const tableBody = document.getElementById('productTable').querySelector('tbody');
    tableBody.innerHTML = '';
    filteredProducts.forEach((product, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="No.">${product.no}</td>
            <td data-label="Category">${product.category}</td>
            <td data-label="Serial Number">${product.serial}</td>
            <td data-label="Product Name">${product.name}</td>
            <td data-label="Size">${product.size}</td>
            <td data-label="Minimum Price">${product.minPrice}</td>
            <td data-label="Price">${product.price}</td>
            <td data-label="Photo">
                ${product.photo === '--' ? '--' : `<button class="view-photo" onclick="viewPhoto('${product.photo}')">View Photo</button>`}
            </td>
            <td data-label="Details">${product.details}</td>
            <td data-label="Action">
                <button class="edit" onclick="editProduct(${index})">Edit</button>
                <button class="delete" onclick="confirmDelete('${product.id}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
});

// फोटो दिखाने का फंक्शन
function viewPhoto(photoUrl) {
    const modal = document.getElementById('photoModal');
    const photoView = document.getElementById('photoView');
    photoView.innerHTML = `<img src="${photoUrl}" alt="Product Photo">`;
    modal.style.display = 'block';
    document.querySelector('.photo-close').onclick = function() {
        modal.style.display = 'none';
    };
}

// फोटो हैंडलिंग (Add Product)
document.getElementById('cameraBtn').addEventListener('click', function() {
    document.getElementById('photoInput').setAttribute('capture', 'environment');
    document.getElementById('photoInput').click();
});

document.getElementById('galleryBtn').addEventListener('click', function() {
    document.getElementById('photoInput').removeAttribute('capture');
    document.getElementById('photoInput').click();
});

document.getElementById('photoInput').addEventListener('change', function() {
    if (this.files && this.files[0]) {
        selectedPhoto = this.files[0];
        const preview = document.getElementById('photoPreview');
        preview.innerHTML = `<img src="${URL.createObjectURL(selectedPhoto)}">`;
        preview.style.display = 'block';
        document.getElementById('cameraBtn').style.display = 'none';
        document.getElementById('galleryBtn').style.display = 'none';
        document.getElementById('cancelPhoto').style.display = 'inline';
        document.getElementById('uploadPhoto').style.display = 'inline';
    }
});

document.getElementById('cancelPhoto').addEventListener('click', function() {
    selectedPhoto = null;
    document.getElementById('photoPreview').innerHTML = '';
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('cameraBtn').style.display = 'inline';
    document.getElementById('galleryBtn').style.display = 'inline';
    document.getElementById('cancelPhoto').style.display = 'none';
    document.getElementById('uploadPhoto').style.display = 'none';
});

async function uploadPhoto(file) {
    const storageRef = ref(storage, `photos/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const photoUrl = await getDownloadURL(storageRef);
    return photoUrl;
}

document.getElementById('uploadPhoto').addEventListener('click', async function() {
    if (selectedPhoto) {
        const photoUrl = await uploadPhoto(selectedPhoto);
        selectedPhoto = photoUrl; // URL अपडेट करो
        showNotification('Photo Successfully Uploaded');
        document.getElementById('cancelPhoto').style.display = 'none';
        document.getElementById('uploadPhoto').style.display = 'none';
    }
});

// नया प्रोडक्ट जोड़ें
document.getElementById('addProductForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const insertAt = parseInt(document.getElementById('insertAt').value) || (products.length > 0 ? Math.max(...products.map(p => p.no)) + 1 : 1);
    let photoUrl = '--';
    if (selectedPhoto) {
        photoUrl = await uploadPhoto(selectedPhoto);
    }
    const newProduct = {
        no: insertAt,
        category: document.getElementById('category').value,
        serial: document.getElementById('serial').value,
        name: document.getElementById('name').value,
        size: document.getElementById('size').value || '--',
        minPrice: document.getElementById('minPrice').value || '--',
        price: document.getElementById('price').value,
        photo: photoUrl,
        details: document.getElementById('details').value || '--'
    };
    await setDoc(doc(db, "products", `product_${insertAt}`), newProduct);
    this.reset();
    selectedPhoto = null;
    document.getElementById('photoPreview').innerHTML = '';
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('cameraBtn').style.display = 'inline';
    document.getElementById('galleryBtn').style.display = 'inline';
    loadProducts();
    showNotification('Product added successfully');
});

// डिलीट कन्फर्मेशन के साथ प्रोडक्ट डिलीट करें
function confirmDelete(productId) {
    if (confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
        deleteProduct(productId);
    }
}

async function deleteProduct(productId) {
    try {
        await deleteDoc(doc(db, "products", productId));
        loadProducts();
        showNotification('Product deleted successfully');
    } catch (error) {
        console.error("Error deleting product:", error);
        showNotification('Error deleting product');
    }
}

// फोटो हैंडलिंग (Edit Product)
function editProduct(index) {
    const product = products[index];
    const modal = document.getElementById('editModal');
    modal.style.display = 'block';

    document.getElementById('editIndex').value = index;
    document.getElementById('editCategory').value = product.category;
    document.getElementById('editSerial').value = product.serial;
    document.getElementById('editName').value = product.name;
    document.getElementById('editSize').value = product.size;
    document.getElementById('editMinPrice').value = product.minPrice;
    document.getElementById('editPrice').value = product.price;
    document.getElementById('editPhotoPreview').innerHTML = product.photo !== '--' ? `<img src="${product.photo}">` : '';
    document.getElementById('editPhotoPreview').style.display = product.photo !== '--' ? 'block' : 'none';
    document.getElementById('editDetails').value = product.details;

    document.querySelector('.close').onclick = function() {
        modal.style.display = 'none';
    };

    document.getElementById('editCameraBtn').onclick = function() {
        document.getElementById('editPhotoInput').setAttribute('capture', 'environment');
        document.getElementById('editPhotoInput').click();
    };

    document.getElementById('editGalleryBtn').onclick = function() {
        document.getElementById('editPhotoInput').removeAttribute('capture');
        document.getElementById('editPhotoInput').click();
    };

    document.getElementById('editPhotoInput').onchange = function() {
        if (this.files && this.files[0]) {
            editSelectedPhoto = this.files[0];
            const preview = document.getElementById('editPhotoPreview');
            preview.innerHTML = `<img src="${URL.createObjectURL(editSelectedPhoto)}">`;
            preview.style.display = 'block';
            document.getElementById('editCameraBtn').style.display = 'none';
            document.getElementById('editGalleryBtn').style.display = 'none';
            document.getElementById('editCancelPhoto').style.display = 'inline';
            document.getElementById('editUploadPhoto').style.display = 'inline';
        }
    };

    document.getElementById('editCancelPhoto').onclick = function() {
        editSelectedPhoto = null;
        document.getElementById('editPhotoPreview').innerHTML = product.photo !== '--' ? `<img src="${product.photo}">` : '';
        document.getElementById('editPhotoPreview').style.display = product.photo !== '--' ? 'block' : 'none';
        document.getElementById('editCameraBtn').style.display = 'inline';
        document.getElementById('editGalleryBtn').style.display = 'inline';
        document.getElementById('editCancelPhoto').style.display = 'none';
        document.getElementById('editUploadPhoto').style.display = 'none';
    };

    document.getElementById('editUploadPhoto').onclick = async function() {
        if (editSelectedPhoto) {
            const photoUrl = await uploadPhoto(editSelectedPhoto);
            editSelectedPhoto = photoUrl;
            showNotification('Photo Successfully Uploaded');
            document.getElementById('editCancelPhoto').style.display = 'none';
            document.getElementById('editUploadPhoto').style.display = 'none';
        }
    };
}

// एडिट फॉर्म सबमिट करें
document.getElementById('editProductForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const index = parseInt(document.getElementById('editIndex').value);
    let photoUrl = products[index].photo;
    if (editSelectedPhoto) {
        photoUrl = await uploadPhoto(editSelectedPhoto);
    }
    products[index] = {
        no: products[index].no,
        category: document.getElementById('editCategory').value,
        serial: document.getElementById('editSerial').value,
        name: document.getElementById('editName').value,
        size: document.getElementById('editSize').value || '--',
        minPrice: document.getElementById('editMinPrice').value || '--',
        price: document.getElementById('editPrice').value,
        photo: photoUrl,
        details: document.getElementById('editDetails').value || '--'
    };
    const productId = products[index].id || `product_${products[index].no}`;
    await updateDoc(doc(db, "products", productId), products[index]);
    loadProducts();
    document.getElementById('editModal').style.display = 'none';
    editSelectedPhoto = null;
    showNotification('Product updated successfully');
});

// नोटिफिकेशन दिखाएं
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// पेज लोड होते ही प्रोडक्ट्स लोड करें
loadProducts();