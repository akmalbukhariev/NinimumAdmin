import {useState} from 'react';
import {Alert,Button,Checkbox,Dialog,DialogActions,DialogContent,DialogTitle,FormControlLabel,MenuItem,Stack,Table,TableBody,TableCell,TableHead,TableRow,TextField,Typography} from '@mui/material';
import {useL} from './AdminCommon';
import {apiRequest} from '../api/client';
import type {Row} from '../api/managementApi';

// M14 (TZ v10 §10): staff roles and per-employee permissions, set by the owner.
const base='/ninimum/api/v1/admin/management/access';
export const getStaffAccess=(token:string)=>apiRequest<Row>(base,{token}).then(r=>r.resultData);
const saveStaffAccess=(token:string,id:number,staff_role:string,permissions:string[])=>apiRequest<Row>(`${base}/${id}`,{token,method:'PUT',body:JSON.stringify({staff_role,permissions})}).then(r=>r.resultData);

type L=ReturnType<typeof useL>;
export const staffRoleLabel=(l:L,role?:string,authority?:string)=>authority==='SUPER_ADMIN'?l('Egasi','Владелец','Owner'):({
  DIRECTOR:l('Direktor','Директор','Director'),PURCHASING:l('Xarid mas’uli','Закупщик','Purchasing'),
  OPERATOR:l('Operator','Оператор','Operator'),OBSERVER:l('Kuzatuvchi','Наблюдатель','Observer'),
} as Record<string,string>)[role||'']||l('Administrator (cheklangan)','Администратор (ограниченный)','Administrator (restricted)');
const areaLabel=(l:L,area:string)=>({
  dashboard:l('Bosh sahifa','Главная','Dashboard'),problems:l('Muammoli buyurtmalar','Проблемные заказы','Problem orders'),orders:l('Buyurtmalar','Заказы','Orders'),
  customers:l('Mijozlar','Клиенты','Customers'),products:l('Mahsulotlar','Товары','Products'),categories:l('Kategoriyalar','Категории','Categories'),
  subscriptions:l('Obunalar','Подписки','Subscriptions'),promotions:l('Aksiyalar','Акции','Promotions'),reviews:l('Sharhlar va savollar','Отзывы и вопросы','Reviews and questions'),
  delivery:l('Yetkazib berish','Доставка','Delivery'),warehouse:l('Ombor','Склад','Warehouse'),suppliers:l('Yetkazib beruvchilar','Поставщики','Suppliers'),
  inventory:l('Partiya va manzil qoldiqlari','Партии и остатки по ячейкам','Batches and bin stock'),
} as Record<string,string>)[area]||area;

const withViews=(list:string[])=>{const s=new Set(list);for(const p of list)if(p.endsWith('.edit'))s.add(p.replace(/\.edit$/,'.view'));return [...s];};

export function StaffAccessDialog({token,admin,overview,onClose,onSaved}:{token:string;admin:Row;overview:Row;onClose:()=>void;onSaved:()=>void}){
  const l=useL();
  const [role,setRole]=useState<string>(admin.staff_role||'ADMIN'),[perms,setPerms]=useState<string[]>(admin.permissions||[]),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const areas=[...new Set((overview.permissions as string[]).filter(p=>p.endsWith('.view')).map(p=>p.slice(0,-5)))];
  const has=(p:string)=>perms.includes(p);
  const pickRole=(next:string)=>{setRole(next);setPerms(withViews(overview.roles[next]||[]));};
  // An area is off, view-only or editable; edit always includes view.
  const setArea=(area:string,level:'none'|'view'|'edit')=>setPerms(current=>{const rest=current.filter(p=>p!==`${area}.view`&&p!==`${area}.edit`);return level==='none'?rest:level==='view'?[...rest,`${area}.view`]:[...rest,`${area}.view`,`${area}.edit`];});
  const toggle=(p:string)=>setPerms(current=>current.includes(p)?current.filter(x=>x!==p):[...current,p]);
  const save=async()=>{setBusy(true);setError(null);try{await saveStaffAccess(token,Number(admin.id),role,perms);onSaved();onClose();}catch(e){setError(e instanceof Error?e.message:'Error');}finally{setBusy(false);}};
  return <Dialog open onClose={()=>{if(!busy)onClose()}} fullWidth maxWidth="md"><DialogTitle>{l('Ruxsatlar','Права доступа','Permissions')}: {admin.name||admin.login_id}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
    {error&&<Alert severity="error">{error}</Alert>}
    <TextField select label={l('Rol','Роль','Role')} value={role} disabled={busy} onChange={e=>pickRole(e.target.value)} helperText={l('Rolni tanlasangiz, ruxsatlar shu rolning standart to‘plamiga qaytadi. Keyin har birini alohida o‘zgartirish mumkin.','При выборе роли права сбрасываются к её стандартному набору; затем их можно менять по одному.','Choosing a role resets the permissions to its defaults; you can then change each one.')}>
      {Object.keys(overview.roles).map(r=><MenuItem key={r} value={r}>{staffRoleLabel(l,r)}</MenuItem>)}
    </TextField>
    <Table size="small"><TableHead><TableRow><TableCell>{l('Bo‘lim','Раздел','Area')}</TableCell><TableCell align="center">{l('Yo‘q','Нет','None')}</TableCell><TableCell align="center">{l('Ko‘rish','Просмотр','View')}</TableCell><TableCell align="center">{l('O‘zgartirish','Изменение','Edit')}</TableCell></TableRow></TableHead><TableBody>
      {areas.map(area=>{const level=has(`${area}.edit`)?'edit':has(`${area}.view`)?'view':'none';return <TableRow key={area}><TableCell>{areaLabel(l,area)}</TableCell>
        {(['none','view','edit'] as const).map(v=><TableCell key={v} align="center"><Checkbox disabled={busy} checked={level===v} onChange={()=>setArea(area,v)} slotProps={{input:{'aria-label':`${area} ${v}`}}}/></TableCell>)}</TableRow>;})}
    </TableBody></Table>
    <Typography variant="subtitle2">{l('Qo‘shimcha','Дополнительно','Extra')}</Typography>
    <FormControlLabel control={<Checkbox disabled={busy} checked={has('money.view')} onChange={()=>toggle('money.view')}/>} label={l('Pul ko‘rsatkichlari va tannarx','Денежные показатели и себестоимость','Money figures and costs')}/>
    <FormControlLabel control={<Checkbox disabled={busy} checked={has('approve')} onChange={()=>toggle('approve')}/>} label={l('Hujjatlarni tasdiqlash (kirim, sanash, spisaniya)','Проведение документов (приход, пересчёт, списание)','Approve documents (receipts, counts, write-offs)')}/>
    <FormControlLabel control={<Checkbox disabled={busy} checked={has('money.edit')} onChange={()=>toggle('money.edit')}/>} label={l('Pul bo‘limida hujjat kiritish (xarajat, kirim, o‘tkazma)','Документы в разделе «Деньги» (расход, поступление, перевод)','Enter money documents (expense, income, transfer)')}/>
    <FormControlLabel control={<Checkbox disabled={busy} checked={has('prices.edit')} onChange={()=>toggle('prices.edit')}/>} label={l('Narxlarni o‘zgartirish','Изменение цен','Change prices')}/>
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>{l('Bekor qilish','Отмена','Cancel')}</Button><Button variant="contained" disabled={busy} onClick={()=>void save()}>{l('Saqlash','Сохранить','Save')}</Button></DialogActions></Dialog>;
}
