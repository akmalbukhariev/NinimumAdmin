import {useCallback,useEffect,useState} from 'react';
import {Alert,Button,Chip,Stack,Switch,TextField,Table,TableBody,TableCell,TableHead,TableRow,Typography} from '@mui/material';
import {useL,LoadState,TablePanel,dateTime} from './AdminCommon';
import {apiRequest} from '../api/client';
import {useAuth} from '../auth/AuthProvider';
import type {Row} from '../api/managementApi';

// M14 (TZ v10 §10): strictness rules Q-1…Q-18; switchable ones are on/off separately for staff and the owner.
const base='/ninimum/api/v1/admin/management/rules';
type L=ReturnType<typeof useL>;
const describe=(l:L,code:string)=>({
 'Q-1':l('Tasdiqlangan hujjatni tahrirlash / o‘chirish taqiqlangan — faqat storno','Нельзя менять или удалять проведённый документ — только сторно','Approved documents can’t be edited or deleted — reversal only'),
 'Q-2':l('Ko‘r qabul va ko‘r sanash','Слепая приёмка и слепой пересчёт','Blind receiving and blind counting'),
 'Q-3':l('Kirimda "yaroqli" bo‘lmagan tovarga rasm majburiy','Фото обязательно для негодного товара при приёмке','Photo required for unfit goods at receiving'),
 'Q-4':l('Kirim narxi oldingisidan farq qilsa izoh','Комментарий, если цена прихода отличается от прошлой','Note when the purchase price differs from the last one'),
 'Q-5':l('Spisaniyada rasm majburiy','Фото обязательно при списании','Photo required for a write-off'),
 'Q-6':l('Spisaniyani boshqa odam tasdiqlaydi','Списание проводит другой человек','A write-off is approved by someone else'),
 'Q-7':l('Oylik spisaniya limiti oshsa ogohlantirish','Предупреждение при превышении лимита списаний за месяц','Warning when monthly write-offs exceed the limit'),
 'Q-8':l('Sanashda farq bor qatorga izoh','Комментарий к расхождению при пересчёте','Reason for a count difference'),
 'Q-9':l('Buyurtmani bekor qilishda sabab','Причина при отмене заказа','Reason when cancelling an order'),
 'Q-10':l('Narx o‘zgartirishda sabab','Причина при изменении цены','Reason when changing a price'),
 'Q-11':l('Muddati o‘tgan tovar sotilmaydi; muddat ogohlantirishi','Просроченный товар не продаётся; предупреждение о сроке','Expired goods aren’t sold; expiry warning'),
 'Q-12':l('Buyurtma holatini orqaga qaytarish taqiqlangan','Нельзя вернуть заказ на прошлый статус','An order status can’t go backwards'),
 'Q-13':l('Ommaviy holat o‘zgartirish taqiqlangan','Массовая смена статуса запрещена','No bulk status changes'),
 'Q-14':l('Ombor ilovasida skaner majburiy (kodni qo‘lda kiritish yo‘q)','Сканер обязателен в складском приложении (без ручного ввода)','Scanner required in the warehouse app (no manual code entry)'),
 'Q-15':l('Taymerlar','Таймеры','Timers'),
 'Q-16':l('Yopilgan davrga hujjat kiritish taqiqlangan','Нельзя вносить документы в закрытый период','No documents in a closed period'),
 'Q-17':l('Tovarni o‘chirish taqiqlangan — faqat nofaol','Товар нельзя удалить — только сделать неактивным','Products can’t be deleted — only deactivated'),
 'Q-18':l('Xarajatga chek rasmi majburiy','Фото чека обязательно для расхода','Receipt photo required for an expense'),
} as Record<string,string>)[code]||code;

// Q-16: the owner closes the books up to a date; reopening (an earlier date or none) needs a reason.
function PeriodClosing(){
 const l=useL(),{accessToken}=useAuth();
 const [state,setState]=useState<Row|null>(null),[until,setUntil]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);
 const show=(s:Row)=>{setState(s);setUntil(s.closed_until||'');setReason('');};
 useEffect(()=>{apiRequest<Row>('/ninimum/api/v1/admin/management/period-close',{token:accessToken!}).then(r=>show(r.resultData)).catch(()=>setError(l('Yuklab bo‘lmadi.','Не удалось загрузить.','Could not load.')));},[accessToken]);// eslint-disable-line react-hooks/exhaustive-deps
 const reopen=Boolean(state?.closed_until)&&(!until||until<state!.closed_until);
 const save=async(next:string)=>{setBusy(true);setError(null);try{show((await apiRequest<Row>('/ninimum/api/v1/admin/management/period-close',{token:accessToken!,method:'PUT',body:JSON.stringify({closed_until:next,reason})})).resultData);}
  catch(e){const code=e instanceof Error?e.message:'';setError(code==='PERIOD_REASON_REQUIRED'?l('Davrni ochish uchun sabab yozing.','Укажите причину открытия периода.','Enter a reason to reopen the period.'):code==='PERIOD_FUTURE_DATE'?l('Kelajakdagi sanagacha yopib bo‘lmaydi.','Нельзя закрыть период будущей датой.','You can’t close up to a future date.'):l('Saqlab bo‘lmadi.','Не удалось сохранить.','Could not save.'));}finally{setBusy(false);}};
 if(!state)return error?<Alert severity="error" sx={{mb:2}}>{error}</Alert>:null;
 return <TablePanel sx={{p:2,mb:2}}><Typography variant="subtitle1" sx={{fontWeight:700}}>{l('Davr yopish','Закрытие периода','Period closing')}</Typography>
  <Typography variant="body2" sx={{color:'text.secondary',mb:2}}>{state.closed_until?l(`Davr ${state.closed_until.split('-').reverse().join('.')} gacha yopilgan. Shu sanagacha bo‘lgan pul hujjatlari, yetkazib beruvchiga to‘lovlar, kirimlar va inventar hujjatlarini kiritib, tasdiqlab yoki bekor qilib bo‘lmaydi (Q-16).`,`Период закрыт по ${state.closed_until.split('-').reverse().join('.')}. Денежные документы, оплаты поставщикам, приходы и складские документы по эту дату нельзя вводить, проводить или сторнировать (Q-16).`,`The period is closed up to ${state.closed_until.split('-').reverse().join('.')}. Money documents, supplier payments, receipts and inventory documents up to that date can’t be entered, approved or reversed (Q-16).`):l('Hech qanday davr yopilmagan.','Закрытых периодов нет.','No period is closed.')}</Typography>
  {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError(null)}>{error}</Alert>}
  <Stack direction={{xs:'column',sm:'row'}} spacing={2} sx={{alignItems:{sm:'flex-start'}}}>
   <TextField size="small" type="date" label={l('Qaysi sanagacha yopiladi','Закрыть по дату','Closed up to')} value={until} disabled={busy} onChange={e=>setUntil(e.target.value)} slotProps={{inputLabel:{shrink:true}}}/>
   {reopen&&<TextField size="small" required label={l('Ochish sababi','Причина открытия','Reason to reopen')} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)} sx={{minWidth:240}}/>}
   <Button variant="contained" disabled={busy||until===(state.closed_until||'')||(reopen&&!reason.trim())} onClick={()=>void save(until)}>{reopen?l('Davrni ochish','Открыть период','Reopen'):l('Davrni yopish','Закрыть период','Close period')}</Button>
  </Stack>
  {(state.history as Row[]).length>0&&<Table size="small" sx={{mt:2}}><TableHead><TableRow><TableCell>{l('Sanagacha','По дату','Up to')}</TableCell><TableCell>{l('Sabab','Причина','Reason')}</TableCell><TableCell>{l('Kim','Кто','By')}</TableCell><TableCell>{l('Qachon','Когда','When')}</TableCell></TableRow></TableHead>
   <TableBody>{(state.history as Row[]).map(h=><TableRow key={h.id}><TableCell>{h.closed_until?h.closed_until.split('-').reverse().join('.'):l('Ochilgan','Открыт','Reopened')}</TableCell><TableCell>{h.reason||'—'}</TableCell><TableCell>{h.changed_by}</TableCell><TableCell>{dateTime(h.changed_at)}</TableCell></TableRow>)}</TableBody></Table>}
 </TablePanel>;
}

export function StrictRulesSettings(){
 const l=useL(),{accessToken}=useAuth();
 const [rows,setRows]=useState<Row[]|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState<string|null>(null);
 const load=useCallback(async()=>{try{setRows((await apiRequest<Row[]>(base,{token:accessToken!})).resultData);setError(null);}catch{setError(l('Qoidalarni yuklab bo‘lmadi.','Не удалось загрузить правила.','Could not load the rules.'));}// eslint-disable-next-line react-hooks/exhaustive-deps -- reload on sign-in only
 },[accessToken]);
 useEffect(()=>{void load()},[load]);
 const save=async(r:Row,key:'staff_enabled'|'owner_enabled'|'value',value:boolean|number)=>{setBusy(r.code);try{setRows((await apiRequest<Row[]>(`${base}/${r.code}`,{token:accessToken!,method:'PUT',body:JSON.stringify({staff_enabled:r.staff_enabled,owner_enabled:r.owner_enabled,value:r.value,[key]:value})})).resultData);setError(null);}catch{setError(l('Saqlab bo‘lmadi.','Не удалось сохранить.','Could not save.'));}finally{setBusy(null);}};
 const status=(r:Row)=>r.kind==='ALWAYS'?<Chip size="small" color="success" label={l('Doim yoqilgan','Всегда включено','Always on')}/>
  :r.kind==='LINKED'?<Chip size="small" label={r.code==='Q-15'?l('Sozlamalar → Taymerlar','Настройки → Таймеры','Settings → Timers'):l('Partiya va manzil qoldiqlari → Muddat','Партии и остатки → Сроки','Batches and bin stock → Expiry')}/>
  :r.kind==='MISSING'?<Chip size="small" variant="outlined" label={l('Bo‘lim hali yo‘q','Раздела пока нет','Module not built yet')}/>:null;
 return <><PeriodClosing/><LoadState loading={rows===null&&!error} error={rows===null?error:null} onRetry={()=>void load()}>
  {error&&rows&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError(null)}>{error}</Alert>}
  <Alert severity="info" sx={{mb:2}}>{l('Har bir qoida xodimlar va Egasi uchun alohida yoqiladi. O‘zgarishlar darhol kuchga kiradi va kim o‘zgartirgani yoziladi.','Каждое правило включается отдельно для сотрудников и владельца. Изменения действуют сразу и записываются.','Each rule is switched separately for staff and the owner. Changes apply at once and are logged.')}</Alert>
  <TablePanel><Table size="small"><TableHead><TableRow><TableCell>№</TableCell><TableCell>{l('Qoida','Правило','Rule')}</TableCell><TableCell align="center">{l('Xodim','Сотрудник','Staff')}</TableCell><TableCell align="center">{l('Egasi','Владелец','Owner')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell></TableRow></TableHead>
  <TableBody>{rows?.map(r=><TableRow key={r.code}><TableCell>{r.code}</TableCell><TableCell>{describe(l,r.code)}{r.value&&(r.kind==='SWITCH'?<TextField size="small" type="number" label={l('Farq, %','Разница, %','Difference, %')} defaultValue={r.value} disabled={busy!==null} sx={{display:'block',mt:1,width:140}} slotProps={{htmlInput:{min:1,max:100}}} onBlur={e=>{const v=Number(e.target.value);if(String(v)!==String(r.value)&&Number.isInteger(v)&&v>=1&&v<=100)void save(r,'value',v);}}/>:<Typography variant="caption" sx={{display:'block',color:'text.secondary'}}>{r.value}</Typography>)}{r.updated_by&&<Typography variant="caption" sx={{display:'block',color:'text.secondary'}}>{r.updated_by} · {dateTime(r.updated_at)}</Typography>}</TableCell>
   {r.kind==='SWITCH'?<><TableCell align="center"><Switch checked={Boolean(r.staff_enabled)} disabled={busy!==null} onChange={e=>void save(r,'staff_enabled',e.target.checked)}/></TableCell><TableCell align="center"><Switch checked={Boolean(r.owner_enabled)} disabled={busy!==null} onChange={e=>void save(r,'owner_enabled',e.target.checked)}/></TableCell><TableCell/></>
   :<><TableCell/><TableCell/><TableCell>{status(r)}</TableCell></>}
  </TableRow>)}</TableBody></Table></TablePanel>
 </LoadState></>;
}
