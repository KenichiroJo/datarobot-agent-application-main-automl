import { Link } from 'react-router-dom';
import { FileText, BarChart3, ArrowRight } from 'lucide-react';

const features = [
  {
    to: '/content',
    icon: FileText,
    title: '予測コンテンツ',
    description: '顧客データをもとにリスク予測を実行し、承認/却下レター、説明文書を自動生成します。',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    to: '/insights',
    icon: BarChart3,
    title: 'モデルインサイト',
    description: 'Feature Impact、ROC曲線、Lift Chart等でモデル性能をビジュアル分析。AIアシスタントとも対話できます。',
    color: 'bg-emerald-500/10 text-emerald-500',
  },
];

export function LandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
      <div className="max-w-3xl text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          Predictive AutoML
          <span className="text-primary"> Agent</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-4">
          DataRobotの予測モデルを活用した与信リスク分析とコンテンツ生成プラットフォーム
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {features.map((f) => (
          <Link
            key={f.to}
            to={f.to}
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
              <f.icon size={24} />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">{f.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            <div className="flex items-center gap-1 mt-4 text-sm text-primary font-medium group-hover:gap-2 transition-all">
              開く <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by DataRobot MLOps + LLM Gateway
        </p>
      </div>
    </div>
  );
}
