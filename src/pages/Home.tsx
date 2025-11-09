import { useLanguageStore } from '../store/useLanguageStore';

interface HomeProps {
	onNavigate: (page: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
	const lang = useLanguageStore((state) => state.lang);

	return (
		<div className="space-y-8 max-w-2xl mx-auto text-center">
			<h1 className="text-4xl font-bold text-gray-900">
				{lang === 'ja' ? 'ステラソラ依頼アシスト' :
					lang === 'zh-Hans' ? 'Stella Sora 委托助手' : 'Stella Sora 委託助手'}
			</h1>

			<p className="text-lg text-gray-600">
				{lang === 'ja' ?
					'所持キャラクターから依頼の最適な組み合わせを見つけ、育成の優先度を提案します。' :
					lang === 'zh-Hans' ?
						'从您的角色中找到委托的最佳组合，并提供培养优先级建议。' :
						'從您的角色中找到委託的最佳組合，並提供培養優先級建議。'}
			</p>

			<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
				<h2 className="text-xl font-semibold mb-4 text-blue-900">
					{lang === 'ja' ? '使い方' : lang === 'zh-Hans' ? '使用方法' : '使用方法'}
				</h2>
				<ol className="space-y-2 text-gray-700">
					<li>
						<span className="font-bold text-blue-600">1.</span>{' '}
						{lang === 'ja' ? '所持キャラクターを選択' :
							lang === 'zh-Hans' ? '选择您拥有的角色' : '選擇您擁有的角色'}
					</li>
					<li>
						<span className="font-bold text-blue-600">2.</span>{' '}
						{lang === 'ja' ? '各キャラクターのレベルを設定' :
							lang === 'zh-Hans' ? '设置每个角色的等级' : '設置每個角色的等級'}
					</li>
					<li>
						<span className="font-bold text-blue-600">3.</span>{' '}
						{lang === 'ja' ? '分析したい依頼を最大4件選択' :
							lang === 'zh-Hans' ? '选择最多4个要分析的委托' : '選擇最多4個要分析的委託'}
					</li>
					<li>
						<span className="font-bold text-blue-600">4.</span>{' '}
						{lang === 'ja' ? '最適な組み合わせと育成推奨を確認' :
							lang === 'zh-Hans' ? '查看最佳组合和培养建议' : '查看最佳組合和培養建議'}
					</li>
				</ol>
			</div>

			<button
				onClick={() => onNavigate('roster')}
				className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
			>
				{lang === 'ja' ? '始める' : lang === 'zh-Hans' ? '开始' : '開始'}
			</button>
		</div>
	);
}
