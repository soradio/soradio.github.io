var Player = function() {

  var ui = {
    holder: {
      holder: '.player__holder',
      flippedClass: 'player__holder--flipped'
    },
    cover: {
      cover: '.player__cover',
      errorClass: 'player__cover--error',
      openClass: 'player__cover--open'
    },
    list: {
      list: '.player__list',
      openClass: 'player__list--open'
    },
    tracks: {
      list: '.tracks__list',
      track: '.tracks__track',
      activeClass: 'tracks__track--active'
    },
    options: {
      random: '.options__btn--random',
      playlist: '.options__btn--playlist',
      activeClass: 'options__btn--active'
    },
    info: {
      title: '.player__title',
      artist: '.player__artist'
    },
    progressBarHolder: '.player__progressbar-holder',
    progressBar: '.player__progressbar',
    controls: {
      prev: '.controls__btn--prev',
      next: '.controls__btn--next',
      play: {
        playPause: '.controls__btn--play-pause',
        playIconClass: 'fa-play',
        pauseIconClass: 'fa-pause'
      }
    }
  };

  var songs = {};
  var song = new Audio();
  var songIndex = 0;
  var maxSongIndex = 0;
  var trackPositions = [];
  var songTimer = {};
  var history = [];
  var isPlaying = true;
  var isShuffle = false;

  var getRandomInt = function(min, max, exclude) {
    var num = Math.floor(Math.random() * (max - min + 1)) + min;
    return (num === exclude) ? getRandomInt(min, max, exclude) : num;
  };

  $.fn.filterByData = function(prop, val) {
    return this.filter(
      function() {
        return $(this).data(prop) == val;
      }
    );
  };

  var growProgressbar = function(songCurrentTime) {
    $(ui.progressBar).css('width', songCurrentTime * 100 / song.duration + '%');
  };

  var switchPlayPause = function() {
    var removeClass = isPlaying ? ui.controls.play.playIconClass : ui.controls.play.pauseIconClass;
    var addClass = isPlaying ? ui.controls.play.pauseIconClass : ui.controls.play.playIconClass;
    $(ui.controls.play.playPause)
      .find('i')
      .addClass(addClass)
      .removeClass(removeClass);
  };

  var loadSongs = function(tracks) {
    songs = tracks;
    maxSongIndex = songs.length - 1;
    var trackList = '';
    for (var i = 0; i < songs.length; i++) {
      trackList += '<li data-index="' + i + '" class="tracks__track"><h3 class="tracks__title">' + songs[i].title + '</h3><h4 class="tracks__artist">' + songs[i].artist + '</h4></li>';
    }
    $(ui.tracks.list).html(trackList);
    $(ui.tracks.track).each(function() {
      trackPositions.push($(this).position().top);
    });
  }

  var setSong = function() {
    song.src = songs[songIndex].source;
    $(ui.cover.cover).css('background-image', 'url(' + songs[songIndex].cover + ')');
    $(ui.info.title).html(songs[songIndex].title);
    $(ui.info.artist).html(songs[songIndex].artist);
  };

  var scrub = function(percentageOfTheSong) {
    song.currentTime = percentageOfTheSong * song.duration / 100;
    play();
  };

  var play = function() {
    $(ui.cover.cover).removeClass(ui.cover.errorClass);
    $(ui.tracks.track)
      .removeClass(ui.tracks.activeClass)
      .filterByData('index', songIndex)
      .addClass(ui.tracks.activeClass);
    $(ui.list.list).animate({
      scrollTop: trackPositions[songIndex]
    }, 500);
    song.play();
    songTimer = setInterval(function() {
      growProgressbar(song.currentTime);
    }, 100);
    isPlaying = true;
    switchPlayPause();
  };

  var pause = function() {
    song.pause();
    clearInterval(songTimer);
    isPlaying = false;
    switchPlayPause();
  };

  var prev = function() {
    history.pop();
    if (history.length) {
      songIndex = history[history.length - 1];
    } else {
      songIndex = songIndex > 0 ? songIndex - 1 : maxSongIndex;
    }
    switchSong();
  };

  var next = function() {
    if (isShuffle) {
      songIndex = getRandomInt(0, maxSongIndex, songIndex);
    } else {
      songIndex = songIndex < maxSongIndex ? songIndex + 1 : 0;
    }
    switchSong();
  };

  var switchSong = function() {
    clearInterval(songTimer);
    growProgressbar(0);
    setSong();
    play();
    saveSongAsPlayed();
  };

  var saveSongAsPlayed = function() {
    if (history[history.length - 1] !== songIndex) {
      history.push(songIndex);
    }
  };

  $(ui.controls.play.playPause).on('click', function() {
    if (isPlaying) {
      pause();
      return;
    }
    play();
  });

  $(ui.controls.prev).on('click', function() {
    prev();
  });

  $(document).on('click', ui.tracks.track, function() {
    songIndex = $(this).data('index');
    switchSong();
  });

  $(ui.controls.next).on('click', function() {
    next();
  });

  $(ui.options.random).on('click', function() {
    $(this).toggleClass(ui.options.activeClass);
    isShuffle = !isShuffle;
  });

  $(ui.options.playlist).on('click', function() {
    $(ui.holder.holder).toggleClass(ui.holder.flippedClass);
  });

  $(ui.progressBarHolder).on('click', function(event) {
    scrub((event.pageX - $(this).offset().left) * 100 / $(this).width());
  });

  song.onended = function() {
    next();
  };

  song.onerror = function() {
    $(ui.cover.cover).addClass(ui.cover.errorClass);
  };

  return {
    init: function(tracks) {
      loadSongs(tracks);
      setSong();
    }
  }

}();


var tracks = [
{"title": "Record вЂ” РќРѕРІРѕРµ (27-03-2020)","artist": "Radioshow","source": "http://92.255.66.40/tmp_audio/itunes1/record_new_-_2020-03-27.mp3","cover": "http://www.radiorecord.ru/upload/resize_cache/iblock/064/372_372_1/0644d524cc8bfc1470064e9c61a8287d.png"},
{"title": "вЂЋOliver Heldens presents Heldeep Radio","artist": "Radioshow","source": "http://media.rawvoice.com/oliverheldens/media2-oliverheldens.podtree.com/media/podcast/Heldeep_Radio_301.mp3","cover": "https://is3-ssl.mzstatic.com/image/thumb/Podcasts123/v4/87/e1/28/87e128d0-9079-1049-6f09-4fcbaaa32545/mza_15774772898170683301.jpg/552x0w.jpg"},
{"title": "Atom Pushers & 5ynk ","artist": " Adderall ft. Blak Trash","source": "https://alexa-soundcloud.now.sh/stream/392939265/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000295328094-bloe05-t500x500.jpg"},
{"title": "Tom Tyger ","artist": " Delano ()","source": "https://alexa-soundcloud.now.sh/stream/267792138/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000166181829-ikgldr-t500x500.jpg"},
{"title": "Martin Garrix & Matisse & Sadko feat. Michel Zitron ","artist": " Hold On","source": "https://alexa-soundcloud.now.sh/stream/734493388/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000658868071-e59l2h-t500x500.jpg"},
{"title": "Swanky Tunes ","artist": " In The Club","source": "https://alexa-soundcloud.now.sh/stream/506422833/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000412095261-p8atr1-t500x500.jpg"},
{"title": "Purple Haze Ft. James New ","artist": " Fall In ","source": "https://alexa-soundcloud.now.sh/stream/346065703/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000246263175-zigi0v-t500x500.jpg"},
{"title": "FaderX ","artist": " Lose Yourself ","source": "https://alexa-soundcloud.now.sh/stream/647531889/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000562745667-9bc0kn-t500x500.jpg"},
{"title": "3LAU ","artist": " We Came To Bang ft Luciana (Original Mix) ","source": "https://alexa-soundcloud.now.sh/stream/179030067/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000098573443-yrcb72-t500x500.jpg"},
{"title": "Giraffe Squad ","artist": " Lunar [Premiere]","source": "https://alexa-soundcloud.now.sh/stream/275800736/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000173752156-n0wlp9-t500x500.jpg"},
{"title": "Adam Lambert ","artist": " Never Close Our Eyes (R3hab Oldskool Bounce Remix)","source": "https://alexa-soundcloud.now.sh/stream/55157436/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000027870125-4o9wpn-t500x500.jpg"},
{"title": "Laurent Wolf vs Lucas & Steve ","artist": " Calinda 2K15 (Radio Edit)","source": "https://alexa-soundcloud.now.sh/stream/220109396/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000126962816-7s8bvd-t500x500.jpg"},
{"title": "Dzeko & Torres and Maestro Harrell ","artist": " For You Feat. Delora (Original Mix) ","source": "https://alexa-soundcloud.now.sh/stream/197221917/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000110947706-zv2n9s-t500x500.jpg"},
{"title": "Romi Lux ","artist": " All I Wanted","source": "https://alexa-soundcloud.now.sh/stream/486351594/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000389934516-1n3az6-t500x500.jpg"},
{"title": "Compuphonic ","artist": " Medicis","source": "https://alexa-soundcloud.now.sh/stream/344572099/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000244856053-31r2qi-t500x500.jpg"},
{"title": "B4CH ","artist": " What A Day","source": "https://alexa-soundcloud.now.sh/stream/242411800/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000154824835-fl0es3-t500x500.jpg"},
{"title": "Qrion ","artist": " 23 (Spencer Brown Remix)","source": "https://alexa-soundcloud.now.sh/stream/625244466/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000540094851-u42uka-t500x500.jpg"},
{"title": "R3hab & ZROQ ","artist": " Skydrop (Original Mix)  ","source": "https://alexa-soundcloud.now.sh/stream/71576832/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000036403721-nrb4ks-t500x500.jpg"},
{"title": "David Guetta ","artist": " Joan Of Arc (Featuring Thailand)","source": "https://alexa-soundcloud.now.sh/stream/15973287/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "ul"},
{"title": "Menshee ","artist": " Never (Original Mix) [Track Of The Week 29]","source": "https://alexa-soundcloud.now.sh/stream/274362461/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000172151721-k24fu9-t500x500.jpg"},
{"title": "Faithless ","artist": " Insomnia (Calippo Remix)","source": "https://alexa-soundcloud.now.sh/stream/208485855/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000128693949-8fzist-t500x500.jpg"},
{"title": "Р В­Р В»Р Т‘Р В¶Р ВµР в„–(Allj)","artist": "Р Р€Р В»РЎРЉРЎвЂљРЎР‚Р В°Р СР В°РЎР‚Р С‘Р Р…Р С•Р Р†РЎвЂ№Р Вµ РЎвЂљР В°Р Р…РЎвЂ РЎвЂ№","source": "https://alexa-soundcloud.now.sh/stream/335193822/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000235564949-ficcrg-t500x500.jpg"},
{"title": "Mr. Belt & Wezol ","artist": " RDY2FLY (Radio Edit) ","source": "https://alexa-soundcloud.now.sh/stream/229259382/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000133345826-6n2dh8-t500x500.jpg"},
{"title": "David Guetta & Sia ","artist": " Flames (Tom Martin Remix)","source": "https://alexa-soundcloud.now.sh/stream/451693845/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000354912009-ndehur-t500x500.jpg"},
{"title": "Steve Lawler ","artist": " Crazy Dream (DJs Pareja Remix)","source": "https://alexa-soundcloud.now.sh/stream/325383885/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000225148960-0v2yrc-t500x500.jpg"},
{"title": "John Christian ","artist": " Uno ","source": "https://alexa-soundcloud.now.sh/stream/614613711/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000528907638-xj1q4f-t500x500.jpg"},
{"title": "Danny Olson x Henry Hartley ","artist": " Halcyon","source": "https://alexa-soundcloud.now.sh/stream/741387325/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000665515351-9gvt28-t500x500.jpg"},
{"title": "David Guetta & Sia ","artist": " Flames (Vladimir Cauchemar Remix)","source": "https://alexa-soundcloud.now.sh/stream/451695102/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000354912939-ocptrz-t500x500.jpg"},
{"title": "Gloria Estefan ","artist": " Wepa (R3hab Remix)","source": "https://alexa-soundcloud.now.sh/stream/21100954/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000010390921-i9gcvo-t500x500.jpg"},
{"title": "Danny Avila ","artist": " Tronco (Original Mix)","source": "https://alexa-soundcloud.now.sh/stream/107314428/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000056254022-fqet10-t500x500.jpg"},
{"title": "Going Deeper ","artist": " CRZY","source": "https://alexa-soundcloud.now.sh/stream/544910862/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000458446317-ddxd89-t500x500.jpg"},
{"title": "Gacha Bakradze ","artist": " Restless","source": "https://alexa-soundcloud.now.sh/stream/464542026/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000366108510-eu4i79-t500x500.jpg"},
{"title": "Stadiumx & Taylr Renee ","artist": " Howl At The Moon ()","source": "https://alexa-soundcloud.now.sh/stream/134586434/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000070732191-4cbc1f-t500x500.jpg"},
{"title": "Firebeatz & KSHMR","artist": " No Heroes (feat. Luciana) (Original Mix)","source": "https://alexa-soundcloud.now.sh/stream/164282320/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000088815035-aaxaey-t500x500.jpg"},
{"title": "Rockefeller ","artist": " Do It 2 Nite (Lucas & Steve Remix)","source": "https://alexa-soundcloud.now.sh/stream/189096067/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000105362927-j56zir-t500x500.jpg"},
{"title": "Lycoriscoris ","artist": " Stella (Ryan Davis Rethink)","source": "https://alexa-soundcloud.now.sh/stream/478707306/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000381508962-mkcolj-t500x500.jpg"},
{"title": "Matthias Vogt ","artist": " Heaven's Gate","source": "https://alexa-soundcloud.now.sh/stream/286574604/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000187143540-ci0zzh-t500x500.jpg"},
{"title": "BL3R & Andres Fresko ","artist": " Jumpoff (Carnage Edit) ","source": "https://alexa-soundcloud.now.sh/stream/185065359/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000102674787-b8vnwj-t500x500.jpg"},
{"title": "Ben BoРњв‚¬hmer ","artist": " Vale","source": "https://alexa-soundcloud.now.sh/stream/467577579/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000368964228-o1kklw-t500x500.jpg"},
{"title": "Blinders ","artist": " Sirene ()","source": "https://alexa-soundcloud.now.sh/stream/179939605/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000099185704-45yt45-t500x500.jpg"},
{"title": "BAILE ","artist": " Bind","source": "https://alexa-soundcloud.now.sh/stream/602754891/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000516937278-hyzw4t-t500x500.jpg"},
{"title": "Michael Cassette ","artist": " Shadows Movement (MC's Solar Energy Remake)","source": "https://alexa-soundcloud.now.sh/stream/636037629/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000551436498-714681-t500x500.jpg"},
{"title": "Luttrell & Ben BoРњв‚¬hmer feat. Margret ","artist": " Gibberish","source": "https://alexa-soundcloud.now.sh/stream/656201462/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000572538446-4z5k8r-t500x500.jpg"},
{"title": "Oliver Heldens ","artist": " Koala ","source": "https://alexa-soundcloud.now.sh/stream/157938514/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ","cover": "https://i1.sndcdn.com/artworks-000084670726-rr0o6f-t500x500.jpg"},
];Player.init(tracks);
