/*
js-code by - https://codepen.io/JavaScriptJunkie/pen/qBWrRyg?editors=1000
design by Filip Legierski.
design: https://dribbble.com/shots/9338617-Simple-Music-Player
*/

var app = new Vue({
	el: "#app",
	data: {
		audio: "",
		imgLoaded: false,
		currentlyPlaying: false,
		currentlyStopped: false,
		currentTime: 0,
		checkingCurrentPositionInTrack: "",
		trackDuration: 0,
		currentProgressBar: 0,
		isPlaylistActive: false,
		currentSong: 0,
		debug: false,
		musicPlaylist: [
       {"title": "Record вЂ” РќРѕРІРѕРµ (27-03-2020)","artist": "Radioshow","url": "http://92.255.66.40/tmp_audio/itunes1/record_new_-_2020-03-27.mp3","image": "http://www.radiorecord.ru/upload/resize_cache/iblock/064/372_372_1/0644d524cc8bfc1470064e9c61a8287d.png"},
{"title": "вЂЋOliver Heldens presents Heldeep Radio","artist": "Radioshow","url": "http://media.rawvoice.com/oliverheldens/media2-oliverheldens.podtree.com/media/podcast/Heldeep_Radio_301.mp3","image": "https://is3-ssl.mzstatic.com/image/thumb/Podcasts123/v4/87/e1/28/87e128d0-9079-1049-6f09-4fcbaaa32545/mza_15774772898170683301.jpg/552x0w.jpg"},
{"title": "Atom Pushers & 5ynk ","artist": " Adderall ft. Blak Trash","url": "https://alexa-soundcloud.now.sh/stream/392939265/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000295328094-bloe05-t500x500.jpg"},
{"title": "Tom Tyger ","artist": " Delano ()","url": "https://alexa-soundcloud.now.sh/stream/267792138/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000166181829-ikgldr-t500x500.jpg"},
{"title": "Martin Garrix & Matisse & Sadko feat. Michel Zitron ","artist": " Hold On","url": "https://alexa-soundcloud.now.sh/stream/734493388/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000658868071-e59l2h-t500x500.jpg"},
{"title": "Swanky Tunes ","artist": " In The Club","url": "https://alexa-soundcloud.now.sh/stream/506422833/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000412095261-p8atr1-t500x500.jpg"},
{"title": "Purple Haze Ft. James New ","artist": " Fall In ","url": "https://alexa-soundcloud.now.sh/stream/346065703/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000246263175-zigi0v-t500x500.jpg"},
{"title": "FaderX ","artist": " Lose Yourself ","url": "https://alexa-soundcloud.now.sh/stream/647531889/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000562745667-9bc0kn-t500x500.jpg"},
{"title": "3LAU ","artist": " We Came To Bang ft Luciana (Original Mix) ","url": "https://alexa-soundcloud.now.sh/stream/179030067/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000098573443-yrcb72-t500x500.jpg"},
{"title": "Giraffe Squad ","artist": " Lunar [Premiere]","url": "https://alexa-soundcloud.now.sh/stream/275800736/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000173752156-n0wlp9-t500x500.jpg"},
{"title": "Adam Lambert ","artist": " Never Close Our Eyes (R3hab Oldskool Bounce Remix)","url": "https://alexa-soundcloud.now.sh/stream/55157436/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000027870125-4o9wpn-t500x500.jpg"},
{"title": "Laurent Wolf vs Lucas & Steve ","artist": " Calinda 2K15 (Radio Edit)","url": "https://alexa-soundcloud.now.sh/stream/220109396/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000126962816-7s8bvd-t500x500.jpg"},
{"title": "Dzeko & Torres and Maestro Harrell ","artist": " For You Feat. Delora (Original Mix) ","url": "https://alexa-soundcloud.now.sh/stream/197221917/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000110947706-zv2n9s-t500x500.jpg"},
{"title": "Romi Lux ","artist": " All I Wanted","url": "https://alexa-soundcloud.now.sh/stream/486351594/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000389934516-1n3az6-t500x500.jpg"},
{"title": "Compuphonic ","artist": " Medicis","url": "https://alexa-soundcloud.now.sh/stream/344572099/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000244856053-31r2qi-t500x500.jpg"},
{"title": "B4CH ","artist": " What A Day","url": "https://alexa-soundcloud.now.sh/stream/242411800/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000154824835-fl0es3-t500x500.jpg"},
{"title": "Qrion ","artist": " 23 (Spencer Brown Remix)","url": "https://alexa-soundcloud.now.sh/stream/625244466/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000540094851-u42uka-t500x500.jpg"},
{"title": "R3hab & ZROQ ","artist": " Skydrop (Original Mix)  ","url": "https://alexa-soundcloud.now.sh/stream/71576832/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000036403721-nrb4ks-t500x500.jpg"},
{"title": "David Guetta ","artist": " Joan Of Arc (Featuring Thailand)","url": "https://alexa-soundcloud.now.sh/stream/15973287/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "ul"},
{"title": "Menshee ","artist": " Never (Original Mix) [Track Of The Week 29]","url": "https://alexa-soundcloud.now.sh/stream/274362461/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000172151721-k24fu9-t500x500.jpg"},
{"title": "Faithless ","artist": " Insomnia (Calippo Remix)","url": "https://alexa-soundcloud.now.sh/stream/208485855/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000128693949-8fzist-t500x500.jpg"},
{"title": "Р В­Р В»Р Т‘Р В¶Р ВµР в„–(Allj)","artist": "Р Р€Р В»РЎРЉРЎвЂљРЎР‚Р В°Р СР В°РЎР‚Р С‘Р Р…Р С•Р Р†РЎвЂ№Р Вµ РЎвЂљР В°Р Р…РЎвЂ РЎвЂ№","url": "https://alexa-soundcloud.now.sh/stream/335193822/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000235564949-ficcrg-t500x500.jpg"},
{"title": "Mr. Belt & Wezol ","artist": " RDY2FLY (Radio Edit) ","url": "https://alexa-soundcloud.now.sh/stream/229259382/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000133345826-6n2dh8-t500x500.jpg"},
{"title": "David Guetta & Sia ","artist": " Flames (Tom Martin Remix)","url": "https://alexa-soundcloud.now.sh/stream/451693845/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000354912009-ndehur-t500x500.jpg"},
{"title": "Steve Lawler ","artist": " Crazy Dream (DJs Pareja Remix)","url": "https://alexa-soundcloud.now.sh/stream/325383885/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000225148960-0v2yrc-t500x500.jpg"},
{"title": "John Christian ","artist": " Uno ","url": "https://alexa-soundcloud.now.sh/stream/614613711/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000528907638-xj1q4f-t500x500.jpg"},
{"title": "Danny Olson x Henry Hartley ","artist": " Halcyon","url": "https://alexa-soundcloud.now.sh/stream/741387325/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000665515351-9gvt28-t500x500.jpg"},
{"title": "David Guetta & Sia ","artist": " Flames (Vladimir Cauchemar Remix)","url": "https://alexa-soundcloud.now.sh/stream/451695102/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000354912939-ocptrz-t500x500.jpg"},
{"title": "Gloria Estefan ","artist": " Wepa (R3hab Remix)","url": "https://alexa-soundcloud.now.sh/stream/21100954/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000010390921-i9gcvo-t500x500.jpg"},
{"title": "Danny Avila ","artist": " Tronco (Original Mix)","url": "https://alexa-soundcloud.now.sh/stream/107314428/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000056254022-fqet10-t500x500.jpg"},
{"title": "Going Deeper ","artist": " CRZY","url": "https://alexa-soundcloud.now.sh/stream/544910862/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000458446317-ddxd89-t500x500.jpg"},
{"title": "Gacha Bakradze ","artist": " Restless","url": "https://alexa-soundcloud.now.sh/stream/464542026/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000366108510-eu4i79-t500x500.jpg"},
{"title": "Stadiumx & Taylr Renee ","artist": " Howl At The Moon ()","url": "https://alexa-soundcloud.now.sh/stream/134586434/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000070732191-4cbc1f-t500x500.jpg"},
{"title": "Firebeatz & KSHMR","artist": " No Heroes (feat. Luciana) (Original Mix)","url": "https://alexa-soundcloud.now.sh/stream/164282320/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000088815035-aaxaey-t500x500.jpg"},
{"title": "Rockefeller ","artist": " Do It 2 Nite (Lucas & Steve Remix)","url": "https://alexa-soundcloud.now.sh/stream/189096067/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000105362927-j56zir-t500x500.jpg"},
{"title": "Lycoriscoris ","artist": " Stella (Ryan Davis Rethink)","url": "https://alexa-soundcloud.now.sh/stream/478707306/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000381508962-mkcolj-t500x500.jpg"},
{"title": "Matthias Vogt ","artist": " Heaven's Gate","url": "https://alexa-soundcloud.now.sh/stream/286574604/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000187143540-ci0zzh-t500x500.jpg"},
{"title": "BL3R & Andres Fresko ","artist": " Jumpoff (Carnage Edit) ","url": "https://alexa-soundcloud.now.sh/stream/185065359/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000102674787-b8vnwj-t500x500.jpg"},
{"title": "Ben BoРњв‚¬hmer ","artist": " Vale","url": "https://alexa-soundcloud.now.sh/stream/467577579/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000368964228-o1kklw-t500x500.jpg"},
{"title": "Blinders ","artist": " Sirene ()","url": "https://alexa-soundcloud.now.sh/stream/179939605/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000099185704-45yt45-t500x500.jpg"},
{"title": "BAILE ","artist": " Bind","url": "https://alexa-soundcloud.now.sh/stream/602754891/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000516937278-hyzw4t-t500x500.jpg"},
{"title": "Michael Cassette ","artist": " Shadows Movement (MC's Solar Energy Remake)","url": "https://alexa-soundcloud.now.sh/stream/636037629/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000551436498-714681-t500x500.jpg"},
{"title": "Luttrell & Ben BoРњв‚¬hmer feat. Margret ","artist": " Gibberish","url": "https://alexa-soundcloud.now.sh/stream/656201462/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000572538446-4z5k8r-t500x500.jpg"},
{"title": "Oliver Heldens ","artist": " Koala ","url": "https://alexa-soundcloud.now.sh/stream/157938514/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","image": "https://i1.sndcdn.com/artworks-000084670726-rr0o6f-t500x500.jpg"},
		],
		audioFile: ""
	},
	mounted: function() {
		this.changeSong();
		this.audio.loop = false;
	},
	filters: {
		fancyTimeFormat: function(s) {
			return (s - (s %= 60)) / 60 + (9 < s ? ":" : ":0") + s;
		}
	},
	methods: {
		togglePlaylist: function() {
			this.isPlaylistActive = !this.isPlaylistActive;
		},
		nextSong: function() {
			if (this.currentSong < this.musicPlaylist.length - 1)
				this.changeSong(this.currentSong + 1);
		},
		prevSong: function() {
			if (this.currentSong > 0) this.changeSong(this.currentSong - 1);
		},
		changeSong: function(index) {
			var wasPlaying = this.currentlyPlaying;
			this.imageLoaded = false;
			if (index !== undefined) {
				this.stopAudio();
				this.currentSong = index;
			}
			this.audioFile = this.musicPlaylist[this.currentSong].url;
			this.audio = new Audio(this.audioFile);
			var localThis = this;
			this.audio.addEventListener("loadedmetadata", function() {
				localThis.trackDuration = Math.round(this.duration);
			});
			this.audio.addEventListener("ended", this.handleEnded);
			if (wasPlaying) {
				this.playAudio();
			}
		},
		isCurrentSong: function(index) {
			if (this.currentSong == index) {
				return true;
			}
			return false;
		},
		getCurrentSong: function(currentSong) {
			return this.musicPlaylist[currentSong].url;
		},
		playAudio: function() {
			if (
				this.currentlyStopped == true &&
				this.currentSong + 1 == this.musicPlaylist.length
			) {
				this.currentSong = 0;
				this.changeSong();
			}
			if (!this.currentlyPlaying) {
				this.getCurrentTimeEverySecond(true);
				this.currentlyPlaying = true;
				this.audio.play();
			} else {
				this.stopAudio();
			}
			this.currentlyStopped = false;
		},
		stopAudio: function() {
			this.audio.pause();
			this.currentlyPlaying = false;
			this.pausedMusic();
		},
		handleEnded: function() {
			if (this.currentSong + 1 == this.musicPlaylist.length) {
				this.stopAudio();
				this.currentlyPlaying = false;
				this.currentlyStopped = true;
			} else {
				this.currentlyPlaying = false;
				this.currentSong++;
				this.changeSong();
				this.playAudio();
			}
		},
		onImageLoaded: function() {
			this.imgLoaded = true;
		},
		getCurrentTimeEverySecond: function(startStop) {
			var localThis = this;
			this.checkingCurrentPositionInTrack = setTimeout(
				function() {
					localThis.currentTime = localThis.audio.currentTime;
					localThis.currentProgressBar =
						localThis.audio.currentTime / localThis.trackDuration * 100;
					localThis.getCurrentTimeEverySecond(true);
				}.bind(this),
				1000
			);
		},
		pausedMusic: function() {
			clearTimeout(this.checkingCurrentPositionInTrack);
		},
		toggleDebug: function(){
			this.debug=!this.debug;
			document.body.classList.toggle('debug');
		}
	},
	watch: {
		currentTime: function() {
			this.currentTime = Math.round(this.currentTime);
		}
	},
	beforeDestroy: function() {
		this.audio.removeEventListener("ended", this.handleEnded);
		this.audio.removeEventListener("loadedmetadata", this.handleEnded);

		clearTimeout(this.checkingCurrentPositionInTrack);
	}
});
