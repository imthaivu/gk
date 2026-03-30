const { randomUUID } = require('crypto');
const { dynamodb } = require('../utils/aws-helper');

const TABLE_NAME = 'CafeMenu';

async function createItem(data) {
    const now = data.createdAt || new Date().toISOString();
    const item = {
        itemId: randomUUID(),
        itemName: data.itemName,
        category: data.category,
        price: Number(data.price),
        isAvailable: Boolean(data.isAvailable),
        discountPercent: Number(data.discountPercent) || 0,
        imageUrl: data.imageUrl,
        createdAt: now,
        updatedAt: now,
    };

    await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
    return item;
}

async function getItems() {
    const result = await dynamodb.scan({ TableName: TABLE_NAME }).promise();
    return result.Items || [];
}

async function getItemById(itemId) {
    const result = await dynamodb.get({ TableName: TABLE_NAME, Key: { itemId } }).promise();
    return result.Item || null;
}

async function deleteItem(itemId) {
    await dynamodb.delete({ TableName: TABLE_NAME, Key: { itemId } }).promise();
}

async function updateItem(itemId, data) {
    const result = await dynamodb
        .update({
            TableName: TABLE_NAME,
            Key: { itemId },
            UpdateExpression: 'set itemName=:itemName, category=:category, price=:price, isAvailable=:isAvailable, discountPercent=:discountPercent, imageUrl=:imageUrl, updatedAt=:updatedAt',
            ExpressionAttributeValues: {
                ':itemName': data.itemName,
                ':category': data.category,
                ':price': Number(data.price),
                ':isAvailable': Boolean(data.isAvailable),
                ':discountPercent': Number(data.discountPercent) || 0,
                ':imageUrl': data.imageUrl,
                ':updatedAt': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        })
        .promise();

    return result.Attributes || null;
}

module.exports = {
    createItem,
    getItems,
    getItemById,
    deleteItem,
    updateItem,
};