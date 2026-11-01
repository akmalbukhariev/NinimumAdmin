import {useCallback,useEffect,useState} from 'react';
import {Alert,Box,Button,Chip,FormControlLabel,MenuItem,Stack,Switch,Table,TableBody,TableCell,TableHead,TableRow,Typography} from '@mui/material';
import { TextField } from './AdminField';
import {useL,LoadState,Panel,TablePanel,dateTime,ErrorNotice} from './AdminCommon';
import {apiRequest} from '../api/client';
import {errorText} from '../api/errorText';
import {useAuth} from '../auth/AuthProvider';
import type {Row} from '../api/managementApi';

// Promo period (owner): tariffs are hidden from customers, and customers earn a free month by inviting friends.
const base='/ninimum/api/v1/admin/management/referral';
export function ReferralSettings(){
 const l=useL(),{accessToken}=useAuth();
 const [data,setData]=useState<Row|null>(null),[form,setForm]=useState<Row>({}),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 const show=(d:Row)=>{setData(d);setForm({promo_mode:Boolean(d.promo_mode),welcome_for_all:Boolean(d.welcome_for_all),friends_needed:String(d.friends_needed??5),tariff_plan_id:d.tariff_plan_id??''});};
 const load=useCallback(async()=>{try{show((await apiRequest<Row>(base,{token:accessToken!})).resultData);setError(null);}catch(e){setError(errorText(e,l));}// eslint-disable-next-line react-hooks/exhaustive-deps -- reload on sign-in only
 },[accessToken]);
 useEffect(()=>{void load()},[load]);
 const save=async()=>{setBusy(true);setError(null);setSaved(false);try{show((await apiRequest<Row>(base,{token:accessToken!,method:'PUT',body:JSON.stringify(form)})).resultData);setSaved(true);}catch(e){setError(errorText(e,l));}finally{setBusy(false);}};
 const ready=Number(form.friends_needed)>=1&&Number(form.friends_needed)<=100&&(!form.promo_mode||Boolean(form.tariff_plan_id));
 return <LoadState loading={data===null&&!error} error={data===null?error:null} onRetry={()=>void load()}>
  <ErrorNotice message={data&&error} sx={{mb:2}} onClose={()=>setError(null)}/>
  {saved&&<Alert severity="success" sx={{mb:2}} onClose={()=>setSaved(false)}>{l('Saqlandi.','Сохранено.','Saved.')}</Alert>}
  <Alert severity={form.promo_mode?'warning':'info'} sx={{mb:2}}>{form.promo_mode
   ?l('Promo davri yoqilgan: mijozlar tarif sotib ololmaydi, faol tariflar muddati tugaguncha ishlaydi.','Промо-период включён: тарифы не продаются, действующие работают до конца срока.','Promo period is on: tariffs can’t be bought; active ones run until they end.')
   :l('Promo davri o‘chiq: tariflar odatdagidek sotiladi, promo kod ko‘rinmaydi.','Промо-период выключен: тарифы продаются как обычно, промокод скрыт.','Promo period is off: tariffs are sold as usual and promo codes are hidden.')}</Alert>
  <Panel sx={{p:2.5}}><Stack spacing={2} sx={{maxWidth:460}}>
   <FormControlLabel control={<Switch checked={Boolean(form.promo_mode)} disabled={busy} onChange={e=>setForm(f=>({...f,promo_mode:e.target.checked}))}/>} label={l('Promo davri (tariflarni yashirish)','Промо-период (скрыть тарифы)','Promo period (hide tariffs)')}/>
   <FormControlLabel control={<Switch checked={Boolean(form.welcome_for_all)} disabled={busy||!form.promo_mode} onChange={e=>setForm(f=>({...f,welcome_for_all:e.target.checked}))}/>} label={l('Har bir yangi mijozga 1 oy tarif bepul (kodsiz ham)','Каждому новому клиенту 1 месяц бесплатно (даже без кода)','1 free month for every new customer (even without a code)')}/>
   <TextField required type="number" label={l('Nechta do‘st taklif qilish kerak','Сколько друзей пригласить','Friends to invite')} value={form.friends_needed??''} disabled={busy} slotProps={{htmlInput:{min:1,max:100}}} onChange={e=>setForm(f=>({...f,friends_needed:e.target.value}))}/>
   <TextField required select label={l('Bepul oy uchun tarif','Тариф на бесплатный месяц','Tariff for the free month')} value={form.tariff_plan_id??''} disabled={busy} onChange={e=>setForm(f=>({...f,tariff_plan_id:e.target.value}))}>{(data?.plans||[]).map((p:Row)=><MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
   <Box><Button variant="contained" disabled={busy||!ready} onClick={()=>void save()}>{l('Saqlash','Сохранить','Save')}</Button></Box>
  </Stack></Panel>
  <Typography variant="h6" sx={{mt:3}}>{l('Kim kimni taklif qildi','Кто кого пригласил','Who invited whom')}</Typography>
  <Typography color="text.secondary">{l('Jami do‘stlar','Всего друзей','Friends')}: {data?.friends_total??0} · {l('Berilgan bepul oylar','Выдано бесплатных месяцев','Free months given')}: {data?.free_months??0}</Typography>
  <TablePanel><Table size="small"><TableHead><TableRow><TableCell>{l('Yangi mijoz','Новый клиент','New customer')}</TableCell><TableCell>{l('Taklif qilgan','Пригласил','Invited by')}</TableCell><TableCell>{l('Kod','Код','Code')}</TableCell><TableCell>{l('Sana','Дата','Date')}</TableCell><TableCell>{l('Taklif qilganning do‘stlari','Друзей у пригласившего','Inviter’s friends')}</TableCell></TableRow></TableHead>
  <TableBody>{data?.rows?.length?data.rows.map((r:Row)=><TableRow key={r.invited_user_id}><TableCell>{r.invited_name}<br/>{r.invited_phone}</TableCell><TableCell>{r.inviter_name}<br/>{r.inviter_phone}</TableCell><TableCell>{r.code}</TableCell><TableCell>{dateTime(r.created_at)}</TableCell><TableCell>{r.inviter_friends} / {data.friends_needed}{Boolean(r.inviter_rewarded)&&<Chip size="small" color="success" sx={{ml:1}} label={l('1 oy berildi','Месяц выдан','Month given')}/>}</TableCell></TableRow>)
   :<TableRow><TableCell colSpan={5}>{l('Hali taklif yo‘q.','Приглашений пока нет.','No invitations yet.')}</TableCell></TableRow>}</TableBody></Table></TablePanel>
 </LoadState>;
}
