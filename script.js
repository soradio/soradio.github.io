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
  var isPlaying = false;
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