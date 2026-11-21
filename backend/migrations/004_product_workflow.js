'use strict';
// Additive migration: status for draft/archive; variant image association.
// Never deletes or rewrites customer orders, products or variants.
const {DataTypes}=require('sequelize');
module.exports.up=async qi=>{
 const columns=await qi.describeTable('products');
 if(!columns.status){
   await qi.addColumn('products','status',{type:DataTypes.ENUM('draft','active','archived'),allowNull:false,defaultValue:'active'});
   await qi.sequelize.query("UPDATE products SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'draft' END");
 }
 const images=await qi.describeTable('product_images');
 if(!images.variant_id){
   await qi.addColumn('product_images','variant_id',{type:DataTypes.INTEGER.UNSIGNED,allowNull:true,references:{model:'product_variants',key:'id'},onDelete:'SET NULL',onUpdate:'CASCADE'});
 }
 const indexes=await qi.showIndex('product_images');
 if(!indexes.some(x=>x.name==='idx_product_image_variant')) await qi.addIndex('product_images',['variant_id'],{name:'idx_product_image_variant'});
};
