const { s3 } = require('../utils/aws-helper');

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const BUCKET_NAME = process.env.BUCKET_NAME;

const generateKey = (originalName = 'image.jpg') => {
    const rawExt = (originalName.split('.').pop() || 'jpg').toLowerCase();
    const ext = rawExt.replace(/[^a-z0-9]/g, '') || 'jpg';
    return Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
};

const uploadFile = async file => {
    if (!file) throw new Error('Missing file');
    if (!ALLOWED_TYPES.includes(file.mimetype)) throw new Error('Unsupported image type');
    if (!BUCKET_NAME) throw new Error('Missing BUCKET_NAME in .env');

    const key = generateKey(file.originalname);

    await s3
        .upload({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        })
        .promise();

    return 'https://' + BUCKET_NAME + '.s3.amazonaws.com/' + encodeURIComponent(key).replace(/%2F/g, '/');
};

const deleteFile = async fileUrl => {
    if (!fileUrl || !BUCKET_NAME) return;
    let key = '';
    try {
        const { pathname } = new URL(fileUrl);
        key = decodeURIComponent(pathname).replace(/^\/+/, '');
    } catch (_err) {
        key = decodeURIComponent(String(fileUrl).split('.amazonaws.com/').pop() || '').replace(/^\/+/, '');
    }
    if (!key) return;
    await s3.deleteObject({ Bucket: BUCKET_NAME, Key: key }).promise();
};

module.exports = { uploadFile, deleteFile };