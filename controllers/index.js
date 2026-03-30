const MenuModel = require('../models');
const { uploadFile, deleteFile } = require('../service/file.service');

const CATEGORY_OPTIONS = ['Coffee', 'Tea', 'Juice', 'Cake'];

const parseAvailability = value => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return null;
};

const buildViewItem = item => {
    const discount = Number(item.discountPercent) || 0;
    const price = Number(item.price) || 0;
    const salePrice = Math.round(price * (1 - discount / 100));
    return {
        ...item,
        salePrice,
        isAvailable: Boolean(item.isAvailable),
    };
};

const getFormMeta = () => ({
    categories: CATEGORY_OPTIONS,
});

const validatePayload = payload => {
    const errors = [];
    const name = String(payload.itemName || '').trim();
    const category = String(payload.category || '').trim();
    const price = Number(payload.price);
    const discountPercent = Number(payload.discountPercent);
    const isAvailable = parseAvailability(payload.isAvailable);

    if (!name) errors.push('Ten mon khong duoc de trong.');
    if (!CATEGORY_OPTIONS.includes(category)) errors.push('Loai mon chi nhan Coffee / Tea / Juice / Cake.');

    if (!Number.isFinite(price) || price <= 0) errors.push('Gia mon phai > 0.');

    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 50) {
        errors.push('Giam gia chi nhan tu 0 den 50 phan tram.');
    }

    if (isAvailable === null) errors.push('Trang thai con mon khong hop le.');

    return { errors, name, category, price, discountPercent, isAvailable };
};

async function getAll(req, res) {
    try {
        const keyword = (req.query.q || '').trim().toLowerCase();
        const category = (req.query.category || '').trim();
        const availability = (req.query.isAvailable || '').trim();

        let items = await MenuModel.getItems();

        if (keyword) {
            items = items.filter(item => String(item.itemName || '').toLowerCase().includes(keyword));
        }

        if (category && CATEGORY_OPTIONS.includes(category)) {
            items = items.filter(item => item.category === category);
        }

        if (availability === 'true' || availability === 'false') {
            const flag = availability === 'true';
            items = items.filter(item => Boolean(item.isAvailable) === flag);
        }

        items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        const viewItems = items.map(buildViewItem);

        const availableByCategory = CATEGORY_OPTIONS.map(cat => ({
            category: cat,
            count: items.filter(i => i.category === cat && i.isAvailable).length,
        }));

        const msg = (req.query.msg || '').trim();
        const alertMap = {
            created: { type: 'success', text: 'Them mon thanh cong.' },
            updated: { type: 'success', text: 'Cap nhat mon thanh cong.' },
            deleted: { type: 'success', text: 'Xoa mon thanh cong.' },
        };

        return res.render('index', {
            items: viewItems,
            q: req.query.q || '',
            category,
            availability,
            categories: CATEGORY_OPTIONS,
            availableByCategory,
            flash: alertMap[msg] || null,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Loi khi tai menu.');
    }
}

async function getById(req, res) {
    try {
        const item = await MenuModel.getItemById(req.params.id);
        if (!item) return res.status(404).send('Khong tim thay mon.');

        return res.render('detail', {
            item: buildViewItem(item),
            formMeta: getFormMeta(),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Loi khi xem chi tiet.');
    }
}

function showCreateForm(_req, res) {
    return res.render('create', {
        errors: [],
        oldData: {
            isAvailable: true,
            discountPercent: 0,
        },
        formMeta: getFormMeta(),
    });
}

async function create(req, res) {
    const payload = req.body;
    const { errors, name, category, price, discountPercent, isAvailable } = validatePayload(payload);

    if (!req.file) errors.push('Vui long chon anh mon.');

    if (errors.length) {
        return res.status(400).render('create', {
            errors,
            oldData: payload,
            formMeta: getFormMeta(),
        });
    }

    try {
        const imageUrl = await uploadFile(req.file);
        const now = new Date().toISOString();
        await MenuModel.createItem({
            itemName: name,
            category,
            price,
            isAvailable,
            discountPercent,
            imageUrl,
            createdAt: now,
        });
        return res.redirect('/menu?msg=created');
    } catch (err) {
        console.error(err);
        return res.status(500).render('create', {
            errors: ['Khong the them mon. Vui long thu lai.'],
            oldData: payload,
            formMeta: getFormMeta(),
        });
    }

}

async function deleteItem(req, res) {
    try {
        const current = await MenuModel.getItemById(req.params.id);
        if (current) {
            await MenuModel.deleteItem(req.params.id);
            if (current.imageUrl) await deleteFile(current.imageUrl);
        }
        return res.redirect('/menu?msg=deleted');
    } catch (err) {
        console.error(err);
        return res.status(500).send('Khong the xoa mon.');
    }
}

async function showEditForm(req, res) {
    try {
        const item = await MenuModel.getItemById(req.params.id);
        if (!item) return res.status(404).send('Khong tim thay mon.');

        return res.render('edit', {
            item: buildViewItem(item),
            errors: [],
            formMeta: getFormMeta(),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Loi khi tai form sua.');
    }
}

async function update(req, res) {
    try {
        const current = await MenuModel.getItemById(req.params.id);
        if (!current) return res.status(404).send('Khong tim thay mon.');

        const payload = {
            ...current,
            ...req.body,
            itemName: current.itemName,
            category: current.category,
        };

        const { errors, name, category, price, discountPercent, isAvailable } = validatePayload(payload);

        if (errors.length) {
            return res.status(400).render('edit', {
                item: buildViewItem({...payload, itemId: current.itemId }),
                errors,
                formMeta: getFormMeta(),
            });
        }

        let imageUrl = current.imageUrl || '';
        let newImageUploaded = false;

        if (req.file) {
            imageUrl = await uploadFile(req.file);
            newImageUploaded = true;
        }

        await MenuModel.updateItem(req.params.id, {
            itemName: name,
            category,
            price,
            isAvailable,
            discountPercent,
            imageUrl,
        });

        if (newImageUploaded && current.imageUrl) {
            await deleteFile(current.imageUrl);
        }

        return res.redirect('/menu?msg=updated');
    } catch (err) {
        console.error(err);
        return res.status(500).render('edit', {
            item: buildViewItem({...req.body, itemId: req.params.id }),
            errors: ['Khong the cap nhat mon. Vui long thu lai.'],
            formMeta: getFormMeta(),
        });
    }
}

module.exports = {
    getAll,
    getById,
    showCreateForm,
    create,
    deleteItem,
    showEditForm,
    update,
};