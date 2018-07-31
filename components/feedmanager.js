const config = require('../config/config.json');
const transformations = require('../util/rsstransformations');

const feedRead = require('davefeedread');

const distributor = require('../components/distributor');

const FeedInterface = require('../interfaces/feed');

class FeedManager {
	constructor() {
		this.data = {
			feeds: new Map(),
			timer: undefined,
			lastUpdate: Date.now()
		};

		this.data.timer = setTimeout(this.updateAllFeeds, config.feedInterval*60000); // Convert to minutes
	}

	updateAllFeeds() {
		const newTime = Date.now();
		for (const [feedId, feed] of this.data.feeds)
			this.getNewArticles(feedId, feed).then(articles => {
				// Everything works, we have the new articles for this feed
				// emit them to the discord stuff so they can color and send them
				distributor.emitNewFeedArticles(feedId, articles);
			}).catch(() => {
				// Feed doesn't exist, can ignore and remove safely
				// Idk why this would happen, should most likely log it because something broke
				this.data.feeds.delete(feedId);
				console.warn(`Feed was not removed from instance when removed from redis!`);
			});

		this.data.lastUpdate = newTime;
	}

	getNewArticles(feedId, feed=this.data.feeds.get(feedId)) {
		if (feed === undefined || !feed.exists()) return Promise.reject(feedId);
		const transforms = config.rssSpecialCare[feedId] ? config.rssSpecialCare[feedId] : [];

		return new Promise(resolve => {feedRead.parseUrl(feed.getLink(), config.rssTimeout, (err, {items}) => {
			let articles = [];

			if (err) {
				// Handle and error like nothing is really wrong, just update the status of the feed and act like no new articles exist
				// Because thats technically true
				feed.setLastStatus(`Site gave error: ${err.status}`);
			} else {
				for (let item of items)
					// Assume the pubdate will never get transformed
					if (Date.parse(item.pubdate) > this.data.lastUpdate) {
						for (const transform of transforms)
							item = transformations[transform](item);

						// Workable item
						articles.push({
							title: item.title,
							description: item.summary,
							url: item.link,
							timestamp: item.pubdate,
							color: '',
							thumbnail: {
								url: item.image.url
							},
							author: {
								name: item.author ? item.author : item.meta.title,
								url: item.meta.link
							}
						});
					}
			}

			resolve(articles);
		})});
	}

	subscribeFeed(feedId, guildId) {
		let feed = '';

		if (!this.hasFeed(feedId)) {
			feed = new FeedInterface(feedId);
			this.data.feeds.set(feedId, feed);
		} else {
			feed = this.data.feeds.get(feedId);
		}

		return feed.addGuild(guildId);
	}

	async unsubscribeFeed(feedId, guildId) {
		if (this.hasFeed(feedId)) {
			const feed = this.data.feeds.get(feedId);
			feed.removeGuild(guildId);

			if (!feed.exists())
				this.data.feeds.delete(feedId);
		}
		return Promise.resolve();
	}

	hasFeed(feedId) {
		return this.data.feeds.has(feedId);
	}
}

module.exports = new FeedManager();

/*
// NYTIMES
{
	title: 'Chinese Shopping App Pinduoduo Sued in U.S. Ahead of I.P.O.',
    description: 'As it prepares to list shares on the Nasdaq, the fast-growing online marketplace has been hit by a complaint that it allows sales of knockoff diapers.',
	summary: 'As it prepares to list shares on the Nasdaq, the fast-growing online marketplace has been hit by a complaint that it allows sales of knockoff diapers.',
	date: 2018-07-21T02:41:08.000Z,
	pubdate: 2018-07-21T02:41:08.000Z,
	pubDate: 2018-07-21T02:41:08.000Z,
	link: 'https://www.nytimes.com/2018/07/20/technology/pinduoduo-china-shopping-nasdaq-ipo.html?partner=rss&emc=rss',
	guid: 'https://www.nytimes.com/2018/07/20/technology/pinduoduo-china-shopping-nasdaq-ipo.html',
	author: 'RAYMOND ZHONG',
	comments: null,
	origlink: null,
	image: {},
	source: {},
	categories: [Array],
	enclosures: [Array],
	'rss:@': {},
	'rss:title': [Object],
	'rss:link': [Object],
	permalink: 'https://www.nytimes.com/2018/07/20/technology/pinduoduo-china-shopping-nasdaq-ipo.html',
	'rss:guid': [Object],
	'atom:link': [Object],
	'media:content': [Object],
	'media:description': [Object],
	'media:credit': [Object],
	'rss:description': [Object],
	'dc:creator': [Object],
	'rss:pubdate': [Object],
	'rss:category': [Array],
	meta: [Object]
}

// ANN
{
	title: 'Hanebado! ‒ Episode 4',
	description: '"I wish the show believed in Hanesaki\'s compelling character development enough to quit overcompensating with so much manufactured melodrama."',
	summary: '"I wish the show believed in Hanesaki\'s compelling character development enough to quit overcompensating with so much manufactured melodrama."',
	date: 2018-07-24T01:01:00.000Z,
	pubdate: 2018-07-24T01:01:00.000Z,
	pubDate: 2018-07-24T01:01:00.000Z,
	link: 'http://www.animenewsnetwork.com/review/hanebado/episode-4/.134587',
	guid: 'http://www.animenewsnetwork.com/cms/.134587',
	author: null,
	comments: null,
	origlink: null,
	image: {},
	source: {},
	categories: [Array],
	enclosures: [],
	'atom:@': [Object],
	'atom:title': [Object],
	'atom:link': [Object],
	'atom:id': [Object],
	'atom:published': [Object],
	'atom:updated': [Object],
	'atom:summary': [Object],
	'atom:category': [Object],
	'ann:cmssection': [Object],
	meta: [Object]
}

// CR
// Uhhh, wtf cr
// The description is the article, not a description of it...
// Even the summary is freaking embedded html, but like, broken
{
	title: 'Catch a Shiny EVA-01 with New Parfom Evangelion Figure',
	description: '<p><img src="https://img1.ak.crunchyroll.com/i/spire3/ed54598869288a520f84064e448b05c11532456235_full.png" alt="" width="640" height="360" /></p>\r\r\n<p>&nbsp;</p>\r\r\n<p><em>Evangelion</em>&nbsp;figure collectors are already likely familiar with the "Parfom" line, a highly poseable and vaguely chibi reimagining of the new films\' units. RyunRyunTei has returned with a new, metallic variant of the design!</p>\r\r\n<p>&nbsp;</p>\r\r\n<p>The highly poseable figure can be displayed in Berserk Mode, and comes with a Progressive Knife and Pallet Rifle for posing. You can also use its Umbilical Cable as a stand, though the figure does come with a clear plastic stand as well.</p>\r\r\n<p>&nbsp;</p>\r\r\n<p><img src="https://img1.ak.crunchyroll.com/i/spire4/d89113e1f80652dfcacfbccd9fb2b7061532464982_full.jpg" alt="" width="640" height="896" /></p>\r\r\n<p><img src="https://img1.ak.crunchyroll.com/i/spire4/ef20e109a3eeec677a257357c8bbd46a1532465007_full.jpg" alt="" width="640" height="896" /></p>\r\r\n<p><img src="https://img1.ak.crunchyroll.com/i/spire1/bd1828404a9663d88193f7b1022a27ad1532465031_full.jpg" alt="" width="640" height="895" /></p>\r\r\n<p>&nbsp;</p>\r\r\n<p>This is the third version of the figure, coming after the <a href="/store/p/205693/Evangelion-Unit-01-Parfom-Rebuild-of-Evangelion">original</a> and <a href="/store/p/206085/Evangelion-Unit-01Awakened-Ver-Parfom">"Awakened"</a> versions.</p>\r\r\n<p>&nbsp;</p>\r\r\n<p>Preorders are open now for 7,200 yen, and the figure is expected to be released in May 2019.</p>\r\r\n<p>&nbsp;</p>\r\r\n<p><strong>&gt;&gt; <a href="http://www.goodsmile.info/ja/product/7465/%E3%83%91%E3%83%AB%E3%83%95%E3%82%A9%E3%83%A0+%E3%82%A8%E3%83%B4%E3%82%A1%E3%83%B3%E3%82%B2%E3%83%AA%E3%82%AA%E3%83%B3%E5%88%9D%E5%8F%B7%E6%A9%9F+%E3%83%A1%E3%82%BF%E3%83%AA%E3%83%83%E3%82%AFVer.html">Good Smile Company Order Page</a></strong></p>\r\r\n<p><strong><br /></strong></p>\r\r\n<p>Source: <a href="https://animeanime.jp/article/2018/07/24/38927.html">Anime! Anime!</a></p>\r\r\n<p>&nbsp;</p>\r\r\n<p>-----</p>\r\r\n<p>&nbsp;</p>\r\r\n<p><em>Kara Dennison is responsible for&nbsp;</em><em><a href="http://www.conscrew.com/" target="_blank">multiple webcomics</a></em><em>, and is half the creative team behind the OEL light novel series&nbsp;</em><em><a href="http://www.owlsflower.com/" target="_blank">Owl\'s Flower</a></em><em>. She blogs at&nbsp;</em><em><a href="http://www.karadennison.com/" target="_blank">karadennison.com</a></em><em>&nbsp;and tweets&nbsp;</em><em><a href="http://www.twitter.com/RubyCosmos" target="_blank">@RubyCosmos</a></em><em>. Her latest book, </em><em>Black Archive #21 &ndash; Heaven Sent,</em><em> is </em><em><a href="https://obversebooks.co.uk/product/21-sent/">currently available</a></em><em> from Obverse Books.</em><em></em></p>',
	summary: 'Good Smile releases limited-edition metallic model<br/><img src="https://img1.ak.crunchyroll.com/i/spire2/ab0b0e9f40702f5b3945356bf27bcf231532465362_thumb.png"  /><br/><br/><p>EVA Unit-01 shines bright in the new Parfom figure from <em>Rebuild of Evangelion!</em>&nbsp;The poseable recreation is painted in metallic and fluorescent tones, and comes with props for all sorts of cool action poses. Find out where to preorder after the jump!</p>',
	date: 2018-07-24T23:08:00.000Z,
	pubdate: 2018-07-24T23:08:00.000Z,
	pubDate: 2018-07-24T23:08:00.000Z,
	link: 'http://feedproxy.google.com/~r/crunchyroll/animenews/~3/iEdJ2hqTCwA/catch-a-shiny-eva-01-with-new-parfom-evangelion-figure',
	guid: 'http://www.crunchyroll.com/anime-news/2018/07/24/catch-a-shiny-eva-01-with-new-parfom-evangelion-figure',
	author: 'news+feed@crunchyroll.com',
	comments: null,
	origlink: 'http://www.crunchyroll.com/anime-news/2018/07/24/catch-a-shiny-eva-01-with-new-parfom-evangelion-figure',
	image: {},
	source: {},
	categories: [],
	enclosures: [],
	'rss:@': {},
	'rss:title': [Object],
	'rss:author': [Object],
	'rss:description': [Object],
	'content:encoded': [Object],
	'rss:pubdate': [Object],
	'rss:link': [Object],
	'rss:guid': [Object],
	'feedburner:origlink': [Object],
	meta: [Object]
}
 */