import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from '../../i18n';

interface HomeProps {
	onNavigate: (page: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
	const lang = useLanguageStore((state) => state.lang);
	const { t } = useTranslation(lang);

	return (
		<div className="space-y-8 max-w-2xl mx-auto text-center">
			<h1 className="text-4xl font-bold text-gray-900">
				{t('app.title')}
			</h1>

			<p className="text-lg text-gray-600">
				{t('home.description')}
			</p>

			<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
				<h2 className="text-xl font-semibold mb-4 text-blue-900">
					{t('home.howToUse')}
				</h2>
				<ol className="space-y-2 text-gray-700">
					<li>
						<span className="font-bold text-blue-600">1.</span>{' '}
						{t('home.step1')}
					</li>
					<li>
						<span className="font-bold text-blue-600">2.</span>{' '}
						{t('home.step2')}
					</li>
					<li>
						<span className="font-bold text-blue-600">3.</span>{' '}
						{t('home.step3')}
					</li>
					<li>
						<span className="font-bold text-blue-600">4.</span>{' '}
						{t('home.step4')}
					</li>
				</ol>
			</div>

			<button
				onClick={() => onNavigate('roster')}
				className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
			>
				{t('buttons.start')}
			</button>
		</div>
	);
}
