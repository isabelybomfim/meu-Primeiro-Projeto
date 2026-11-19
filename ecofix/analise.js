(() => {
    const status=document.querySelector("#analise-status"),resumo=document.querySelector("#analise-resumo"),cenarios=document.querySelector("#analise-cenarios"),detalhes=document.querySelector("#analise-detalhes");
    const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
    const PRECO_TYTON=1.03, PRECO_REUTILIZAVEL=5.75;
    const custo=item=>Number(item.quantidade)*PRECO_TYTON;
    const invUnit=item=>Number(item.quantidade)*PRECO_REUTILIZAVEL;
    const equilibrio=()=>PRECO_REUTILIZAVEL/PRECO_TYTON;
    const ciclosMin=item=>Math.floor(equilibrio(item))+1;
    const charts=[];
    function card(label,value){const e=document.createElement("div");e.className="card";const h=document.createElement("h3"),p=document.createElement("p");h.textContent=label;p.textContent=value;e.append(h,p);resumo.append(e);}
    function info(label,value,desc){const e=document.createElement("article");e.className="cenario-card";const h=document.createElement("h3"),p=document.createElement("p"),s=document.createElement("small");h.textContent=label;p.textContent=value;s.textContent=desc;e.append(h,p,s);cenarios.append(e);}
    function render(data){
      charts.forEach(c=>c.destroy());charts.length=0;
      const items=Array.isArray(data.substituicoes)?data.substituicoes:[];
      const producao=Number(data.producaoDiaria??88),dias=Number(data.diasMes??22),meses=Number(data.mesesAno??12);
      resumo.innerHTML="";cenarios.innerHTML="";detalhes.innerHTML="";
      if(!items.length){status.textContent="Ainda não há substituições cadastradas para analisar.";document.querySelector(".analise-graficos").hidden=true;return;}
      document.querySelector(".analise-graficos").hidden=false;
      status.textContent="Dados carregados do banco compartilhado. Valores apresentados como projeções.";
      const porCaminhao=items.reduce((s,i)=>s+custo(i),0),gastoDia=porCaminhao*producao,gastoMes=gastoDia*dias,gastoAno=gastoMes*meses;
      const investimento=items.reduce((s,i)=>s+invUnit(i)*producao,0),economia=gastoAno-investimento,reducao=gastoAno?economia/gastoAno*100:0;
      card("Investimento inicial",money(investimento));card("Gasto Tyton por caminhão",money(porCaminhao));card("Gasto descartável diário",money(gastoDia));card("Gasto descartável mensal",money(gastoMes));card("Gasto descartável anual",money(gastoAno));card("Economia potencial no primeiro ano",money(economia));
      info("Fórmula principal",money(gastoAno)+" − "+money(investimento)+" = "+money(economia),"Gasto anual com Tyton menos investimento inicial em reutilizáveis. Ciclos não são descontados.");
      info("Ponto de equilíbrio unitário","6 utilizações ou conforme o produto","Preço reutilizável ÷ preço descartável; quantidade mínima de utilizações para superar o custo de aquisição.");
      info("Ciclos estimados","Referência operacional","Acompanham durabilidade e reutilização observadas; não amortizam automaticamente o investimento na economia projetada.");
      items.forEach(i=>{const r=document.createElement("article");r.className="item-local";const h=document.createElement("strong"),p=document.createElement("p");h.textContent=i.local;p.textContent="Quantidade por caminhão: "+i.quantidade+" · Ciclos estimados (validação operacional): "+i.ciclos+" · Custo Tyton por caminhão: "+money(custo(i))+" · Ponto de equilíbrio: "+ciclosMin(i)+" utilizações.";r.append(h,p);if(Number(i.ciclos)<equilibrio(i)){const w=document.createElement("p");w.className="aviso-equilibrio";w.textContent="Validação operacional: a estimativa de ciclos ainda não alcança o ponto de equilíbrio unitário.";r.append(w);}detalhes.append(r);});
      const labels=items.map(i=>i.local),colors=["#001E50","#005B9A","#287DB5","#80B9E0","#A9CDE8","#456A91","#6F8EAE","#C5D9EA"],opts={responsive:true,maintainAspectRatio:true,plugins:{legend:{position:"bottom"}}};
      charts.push(new Chart(document.querySelector("#graficoCustos"),{type:"bar",data:{labels,datasets:[{label:"Gasto Tyton por caminhão",data:items.map(custo),backgroundColor:"#80B9E0"},{label:"Investimento reutilizável por caminhão",data:items.map(invUnit),backgroundColor:"#005B9A"}]},options:opts}));
      const months=Array.from({length:Math.max(0,meses)},(_,i)=>"Mês "+(i+1));
      charts.push(new Chart(document.querySelector("#graficoProjecao"),{type:"line",data:{labels:months,datasets:[{label:"Saldo potencial acumulado após investimento",data:months.map((_,n)=>gastoMes*(n+1)-investimento),borderColor:colors[1],tension:.2}]},options:opts}));
      const gains=items.map(i=>custo(i)*producao*dias*meses-invUnit(i)*producao),positive=gains.filter(v=>v>0);
      document.querySelector("#blocoDivisao").hidden=!positive.length;
      if(positive.length)charts.push(new Chart(document.querySelector("#graficoDivisao"),{type:"doughnut",data:{labels:items.filter((_,i)=>gains[i]>0).map(i=>i.local),datasets:[{data:positive,backgroundColor:positive.map((_,i)=>colors[i%colors.length])}]},options:opts}));
      const max=Math.min(200,Math.max(10,...items.map(i=>Math.max(Number(i.ciclos)*2,Math.ceil(equilibrio(i)*2))))),cycleLabels=Array.from({length:max},(_,i)=>i+1);
      charts.push(new Chart(document.querySelector("#graficoEquilibrio"),{type:"line",data:{labels:cycleLabels,datasets:items.map((i,n)=>({label:i.local,data:cycleLabels.map(c=>Number(i.quantidade)*PRECO_REUTILIZAVEL/c),borderColor:colors[n%colors.length],pointRadius:0,tension:.2}))},options:{...opts,plugins:{...opts.plugins,title:{display:true,text:"Custo reutilizável equivalente por ciclo (referência operacional)"}}}}));
    }
    async function start(){
        if(!window.supabase||!window.ECOFIX_SUPABASE_URL||!window.ECOFIX_SUPABASE_KEY){
            status.textContent="Não foi possível conectar ao banco de dados.";
            return;
        }
        const client=window.supabase.createClient(window.ECOFIX_SUPABASE_URL,window.ECOFIX_SUPABASE_KEY);
        const {data,error}=await client.from("ecofix_state").select("data").eq("id",1).single();
        if(error){console.error(error);status.textContent="Erro ao carregar os dados compartilhados.";return;}
        render(data.data||{});
        client.channel("ecofix-analysis").on("postgres_changes",{event:"*",schema:"public",table:"ecofix_state",filter:"id=eq.1"},payload=>{
            if(payload.new?.data)render(payload.new.data);
        }).subscribe();
    }
    start().catch(error=>{console.error(error);status.textContent="Falha ao carregar a análise.";});
})();
