import {Alert} from '@mui/material';
import { TextField } from './AdminField';
import type {Row} from '../api/managementApi';
import {useL} from './AdminCommon';
export function metadataValues(value:Row):Row {
 const result:Row={};
 for(const key of ['cost_price','min_stock_quantity','shelf_life_days'])result[key]=value[key]==null||value[key]===''?null:Number(value[key]);
 for(const key of ['storage_temperature','ingredients','age_range'])result[key]=String(value[key]??'').trim()||null;
 return result;
}
export function ProductMetadataFields({value,onChange,batchCost}:{value:Row;onChange:(key:string,value:string)=>void;batchCost?:number|null}) {
 const l=useL();
 const fields=[['cost_price',l('Tannarx (so‘m)','Себестоимость (сум)','Cost (UZS)'),'number'],['min_stock_quantity',l('Minimal qoldiq','Минимальный остаток','Minimum stock'),'number'],['shelf_life_days',l('Saqlash muddati (kun)','Срок хранения (дни)','Shelf life (days)'),'number'],['storage_temperature',l('Saqlash harorati','Температура хранения','Storage temperature'),'text'],['ingredients',l('Tarkib','Состав','Ingredients'),'text'],['age_range',l('Yosh oralig‘i','Возраст','Age range'),'text']];
 // TZ v12 A4.3: compare with the real batch cost too; the card field is often empty.
 const cost=Math.max(Number(value.cost_price)||0,Number(batchCost)||0);
 const below=cost>0&&value.subscription_price!=null&&value.subscription_price!==''&&Number(value.subscription_price)<cost;
 return <>{fields.map(([key,label,type])=><TextField key={key} label={label} type={type} value={value[key]??''} multiline={key==='ingredients'} onChange={e=>onChange(key,e.target.value)}/>)}{below&&<Alert severity="warning" sx={{gridColumn:'1 / -1'}}>{l(`Obuna narxi tannarxdan past (tannarx: ${cost.toLocaleString()} so‘m). Saqlashdan oldin narxni tekshiring.`,`Цена подписки ниже себестоимости (${cost.toLocaleString()} сум). Проверьте перед сохранением.`,`Subscription price is below cost (${cost.toLocaleString()} UZS). Review it before saving.`)}</Alert>}</>;
}
