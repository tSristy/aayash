'use strict';
/** Phase 2C/2D LIVE HTTP smoke on disposable DEVELOPMENT database only.
 * Creates temporary test records and archives them; requires explicit opt-in.
 */
const {randomBytes}=require('node:crypto');
const BASE=(process.env.AYASHMART_TEST_URL||'http://localhost:3000').replace(/\/$/,'');
const USER=process.env.AYASHMART_TEST_USERNAME,PASSWORD=process.env.AYASHMART_TEST_PASSWORD;
if(process.env.AYASHMART_ALLOW_TEST_WRITES!=='YES'||process.env.NODE_ENV==='production'||!USER||!PASSWORD){
 console.error('Use a disposable LOCAL database. Set AYASHMART_ALLOW_TEST_WRITES=YES plus test credentials; never run in production.');process.exit(2);
}
let cookie='',pass=0,fail=0,productId=null,categoryId=null,typeId=null,attributeId=null;
const suffix=randomBytes(4).toString('hex');
const check=(condition,message)=>{console.log(`${condition?'PASS':'FAIL'} ${message}`);condition?pass++:fail++;};
async function req(path,method='GET',data){const res=await fetch(`${BASE}/api/admin/catalog/${path}`,{method,headers:{Cookie:cookie,Origin:BASE,...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});return {status:res.status,body:await res.json().catch(()=>({}))};}
(async()=>{
 try{
  const anonymous=await req('products');check(anonymous.status===401,'Anonymous products API blocked');
  const login=await fetch(`${BASE}/api/admin/auth/login`,{method:'POST',headers:{Origin:BASE,'Content-Type':'application/json'},body:JSON.stringify({username:USER,password:PASSWORD})});
  check(login.status===200,'Login with valid admin');if(!login.ok)throw new Error('Cannot authenticate, aborting.');
  cookie=(login.headers.get('set-cookie')||'').split(';')[0];if(!/^ayashmart_admin_sid=[a-f0-9]{64}$/.test(cookie))throw new Error('Expected session cookie missing');
  const attr=await req('attributes','POST',{code:`ingredients_${suffix}`,name:`QA Ingredients ${suffix}`,data_type:'textarea',is_active:true});check(attr.status===201,'Attribute created');attributeId=attr.body.id;if(!attributeId)throw new Error(JSON.stringify(attr.body));
  const type=await req('product-types','POST',{code:`qa_food_${suffix}`,name:`QA Packaged Food ${suffix}`,description:'Disposable smoke test template',is_active:true});check(type.status===201,'Product Type created');typeId=type.body.id;if(!typeId)throw new Error(JSON.stringify(type.body));
  const assigned=await req(`product-types/${typeId}/attributes`,'PUT',{attributes:[{attribute_id:attributeId,group_name:'Food Information',is_required:true,is_visible:true,is_filterable:false}]});check(assigned.status===200&&assigned.body.attributeAssignments?.length===1,'Required attribute assigned');
  const cat=await req('categories','POST',{name:`QA Honey ${suffix}`,slug:`qa-honey-${suffix}`,is_active:true});check(cat.status===201,'Category created');categoryId=cat.body.id;if(!categoryId)throw new Error(JSON.stringify(cat.body));
  const title=`QA Sweet Honey Nuts ${suffix}`,slug=`qa-sweet-honey-nuts-${suffix}`;
  const payload={name:title,slug,category_id:categoryId,brand_id:null,product_type_id:typeId,short_desc:'E2E test product',description:'Temporary, not for sale.',status:'active',specifications:[{attribute_id:attributeId,value:'Honey, Almond, Cashew'}],options:[{code:'weight',name:'Weight',values:['250g','500g']}],variants:[{sku:`QA-HNY-${suffix}-250`,label:'250g',price:350,stock:10,is_default:true,selections:[{option_code:'weight',value:'250g'}]},{sku:`QA-HNY-${suffix}-500`,label:'500g',price:650,stock:5,is_default:false,selections:[{option_code:'weight',value:'500g'}]}],images:[]};
  let invalid=await req('products','POST',{...payload,variants:[payload.variants[0],{...payload.variants[1],sku:payload.variants[0].sku}]});check(invalid.status===422,'Duplicate SKU rejected');
  const created=await req('products','POST',payload);check(created.status===201,'Product with two weight variants created');productId=created.body.id;if(!productId)throw new Error(JSON.stringify(created.body));
  const oldIds=created.body.variants.map(x=>x.id);
  const detail=await req(`products/${productId}`);check(detail.status===200&&detail.body.specifications?.length===1&&detail.body.variants?.length===2,'Dynamic specifications and variants load');
  const publicResponse=await fetch(`${BASE.replace(':3000',':4000')}/api/products/${slug}`);check(publicResponse.status===200,'Published test product visible in public product API');
  const edited={...payload,variants:[{...payload.variants[0],id:oldIds[0]},{...payload.variants[1],id:oldIds[1],price:625,stock:12}]};
  const updated=await req(`products/${productId}`,'PUT',edited);check(updated.status===200&&Number(updated.body.variants[1].price)===625,'Variant price and stock can be edited');check(updated.body.variants.every((x,i)=>x.id===oldIds[i]),'Existing SKU IDs retained on edit');
  const archived=await req(`products/${productId}/status`,'PATCH',{status:'archived'});check(archived.status===200,'Product archived without deleting rows');
  const hidden=await fetch(`${BASE.replace(':3000',':4000')}/api/products/${slug}`);check(hidden.status===404,'Archived product hidden from public product API');
 }catch(error){fail++;console.error('STOPPED:',error.message);}
 finally{
   try{if(productId)await req(`products/${productId}/status`,'PATCH',{status:'archived'});if(categoryId)await req(`categories/${categoryId}`,'PATCH',{is_active:false});if(typeId)await req(`product-types/${typeId}`,'PATCH',{is_active:false});if(attributeId)await req(`attributes/${attributeId}`,'PATCH',{is_active:false});if(cookie)await fetch(`${BASE}/api/admin/auth/logout`,{method:'POST',headers:{Cookie:cookie,Origin:BASE}});}catch(e){console.error('Cleanup warning:',e.message);}
   console.log(`Full catalog smoke: ${pass} PASS, ${fail} FAIL (QA records kept archived).`);process.exitCode=fail?1:0;
 }
})();
