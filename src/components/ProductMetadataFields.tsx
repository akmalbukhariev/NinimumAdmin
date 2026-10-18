import {Alert,TextField} from '@mui/material';
import type {Row} from '../api/managementApi';
import {useL} from './AdminCommon';
export function metadataValues(value:Row):Row {
 const result:Row={};
 for(const key of ['cost_price','min_stock_quantity','shelf_life_days'])result[key]=value[key]==null||value[key]===''?null:Number(value[key]);
 for(const key of ['storage_temperature','ingredients','age_range'])result[key]=String(value[key]??'').trim()||null;
 return result;
}
export function ProductMetadataFields({value,onChange}:{value:Row;onChange:(key:string,value:string)=>void}) {
 const l=useL();
 const fields=[['cost_price',l('Tannarx (so‘m)','Себестоимость (сум)','Cost (UZS)'),'number'],['min_stock_quantity',l('Minimal qoldiq','Минимальный остаток','Minimum stock'),'number'],['shelf_life_days',l('Saqlash muddati (kun)','Срок хранения (дни)','Shelf life (days)'),'number'],['storage_temperature',l('Saqlash harorati','Температура хранения','Storage temperature'),'text'],['ingredients',l('Tarkib','Состав','Ingredients'),'text'],['age_range',l('Yosh oralig‘i','Возраст','Age range'),'text']];
 const below=value.cost_price!=null&&value.cost_price!==''&&value.subscription_price!=null&&value.subscription_price!==''&&Number(value.subscription_price)<Number(value.cost_price);
 return <>{fields.map(([key,label,type])=><TextField key={key} label={label} type={type} value={value[key]??''} multiline={key==='ingredients'} onChange={e=>onChange(key,e.target.value)}/>)}{below&&<Alert severity="warning" sx={{gridColumn:'1 / -1'}}>{l('Obuna narxi tannarxdan past. Saqlashdan oldin narxni tekshiring.','Цена подписки ниже себестоимости. Проверьте перед сохранением.','Subscription price is below cost. Review it before saving.')}</Alert>}</>;
}
