import { randomUnit } from './lottery.js';

export const VERDICTS = Object.freeze([
  { id: 'v01', title: '午夜老司机', line: '本官判你满嘴开车，牵个手却得重新考证。', perk: '今日特权：嘴上不限速。' },
  { id: 'v02', title: '纯爱嘴硬王', line: '本官判你嘴上说玩玩，聊天记录背得最全。', perk: '今日特权：心动允许嘴硬。' },
  { id: 'v03', title: '见色起疑犯', line: '本官判你见色起疑：这么好看，真能轮到你。', perk: '今日特权：先心动再嘴硬。' },
  { id: 'v04', title: '桃花负债人', line: '本官判你桃花没几朵，情话欠了一屁股。', perk: '今日特权：欠吻先记账。' },
  { id: 'v05', title: '钓系空军王', line: '本官判你鱼塘挺大，最后自己咬了对方的钩。', perk: '今日特权：上头不收门票。' },
  { id: 'v06', title: '清汤装荤王', line: '本官判你情话炖得荤，见面却只会说你好。', perk: '今日特权：口嗨暂免驾照。' },
  { id: 'v07', title: '被窝谈判家', line: '本官判你深夜挺会聊，天一亮就恢复礼貌。', perk: '今日特权：夜聊允许加戏。' },
  { id: 'v08', title: '暧昧质检员', line: '本官判你每句晚安，都想查查有没有售后。', perk: '今日特权：晚安可申请返场。' },
  { id: 'v09', title: '一网情深户', line: '本官判你一网情深，网一断就暂时单身。', perk: '今日特权：网恋信号满格。' },
  { id: 'v10', title: '夜聊考古官', line: '本官判你对方只发晚安，你能挖出八层暧昧。', perk: '今日特权：句号也能品出甜。' },
  { id: 'v11', title: '口嗨实习生', line: '本官判你聊天敢飙车，见面先问能坐这吗。', perk: '今日特权：驾照下次再考。' },
  { id: 'v12', title: '亲亲催收员', line: '本官判你表情包亲了八百回，见面还在清嗓子。', perk: '今日特权：亲亲表情不限量。' },
  { id: 'v13', title: '持证脸红员', line: '本官判你嘴比谁都硬，脸红倒是主动交代。', perk: '今日特权：脸红免写说明。' },
  { id: 'v14', title: '暗送秋波站', line: '本官判你秋波暗送太多，对方以为信号不稳。', perk: '今日特权：眼神不限流量。' },
  { id: 'v15', title: '情话外包商', line: '本官判你土味情话批发，真要表白请假三天。', perk: '今日特权：土味也可包邮。' },
  { id: 'v16', title: '纯情装熟工', line: '本官判你把宝贝喊顺口，对视三秒就找出口。', perk: '今日特权：害羞允许读档。' },
  { id: 'v17', title: '有色眼镜商', line: '本官判你有色眼镜常戴，恋爱滤镜从不打折。', perk: '今日特权：心动自带滤镜。' },
  { id: 'v18', title: '脱单战略家', line: '本官判你恋爱攻略写满，实战还在等待加载。', perk: '今日特权：心动免交作业。' },
  { id: 'v19', title: '夜聊画饼师', line: '本官判你深夜喊得亲，白天称呼又变您。', perk: '今日特权：暧昧可白天营业。' },
  { id: 'v20', title: '擦边驾驶员', line: '本官判你话说得很危险，胆子停在安全线。', perk: '今日特权：嘴强暂不扣分。' },
  { id: 'v21', title: '一见钟寝官', line: '本官判你一见钟寝，想得挺美，晚安发得挺早。', perk: '今日特权：白日梦免排队。' },
  { id: 'v22', title: '恋爱装蒜王', line: '本官判你明明想被撩，还装自己信号不好。', perk: '今日特权：心动不用转人工。' },
  { id: 'v23', title: '黄腔清汤派', line: '本官判你段子荤得冒烟，真约会比白粥还淡。', perk: '今日特权：清汤也准装老手。' },
  { id: 'v24', title: '色即是空军', line: '本官判你色心挺满，桃花战绩却是一片空。', perk: '今日特权：空军照样嘴硬。' }
].map(verdict => Object.freeze(verdict)));

export function getVerdict(id) {
  return VERDICTS.find(verdict => verdict.id === id) || null;
}

// Only the previous verdict and a random number affect the result.
export function drawVerdict(previousId = '', random = randomUnit) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Random source must return a number in [0, 1).');
  }
  const options = VERDICTS.filter(verdict => verdict.id !== previousId);
  return options[Math.floor(value * options.length)];
}
