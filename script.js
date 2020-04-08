(function(window, undefined) {

'use strict';

var AudioPlayer = (function() {

  // Player vars!
  var
  docTitle = document.title,
  player   = document.getElementById('ap'),
  playBtn,
  playSvg,
  playSvgPath,
  prevBtn,
  nextBtn,
  plBtn,
  repeatBtn,
  volumeBtn,
  progressBar,
  preloadBar,
  curTime,
  durTime,
  trackTitle,
  audio,
  index = 0,
  playList,
  volumeBar,
  imgCover,
  wheelVolumeValue = 0,
  volumeLength,
  repeating = false,
  seeking = false,
  seekingVol = false,
  rightClick = false,
  apActive = false,
  // playlist vars
  pl,
  plUl,
  plLi,
  tplList =
            '<li class="pl-list" data-track="{count}">'+
              '<div class="pl-list__track">'+
                '<div class="pl-list__icon"></div>'+
                '<div class="pl-list__eq">'+
                  '<div class="eq">'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                  '</div>'+
                '</div>'+
              '</div>'+
              '<div class="pl-list__title">{title}</div>'+
              '<button class="pl-list__remove">'+
                '<svg fill="#000000" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">'+
                    '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>'+
                    '<path d="M0 0h24v24H0z" fill="none"/>'+
                '</svg>'+
              '</button>'+
            '</li>',
  // settings
  settings = {
    volume        : 1,
    changeDocTitle: true,
    confirmClose  : true,
    autoPlay      : false,
    buffered      : true,
    notification  : true,
    playList      : []
  };

  function init(options) {

    if(!('classList' in document.documentElement)) {
      return false;
    }

    if(apActive || player === null) {
      return 'Player already init';
    }

    settings = extend(settings, options);

    // get player elements
    playBtn        = player.querySelector('.ap__controls--toggle');
    playSvg        = playBtn.querySelector('.icon-play');
    playSvgPath    = playSvg.querySelector('path');
    prevBtn        = player.querySelector('.ap__controls--prev');
    nextBtn        = player.querySelector('.ap__controls--next');
    repeatBtn      = player.querySelector('.ap__controls--repeat');
    volumeBtn      = player.querySelector('.volume-btn');
    plBtn          = player.querySelector('.ap__controls--playlist');
    curTime        = player.querySelector('.track__time--current');
    durTime        = player.querySelector('.track__time--duration');
    trackTitle     = player.querySelector('.track__title');
    progressBar    = player.querySelector('.progress__bar');
    preloadBar     = player.querySelector('.progress__preload');
    volumeBar      = player.querySelector('.volume__bar');
    imgCover       = player.querySelector('.image__cover');

    playList = settings.playList;
    playBtn.addEventListener('click', playToggle, false);
    volumeBtn.addEventListener('click', volumeToggle, false);
    repeatBtn.addEventListener('click', repeatToggle, false);

    progressBar.closest('.progress-container').addEventListener('mousedown', handlerBar, false);
    progressBar.closest('.progress-container').addEventListener('mousemove', seek, false);

    document.documentElement.addEventListener('mouseup', seekingFalse, false);

    volumeBar.closest('.volume').addEventListener('mousedown', handlerVol, false);
    volumeBar.closest('.volume').addEventListener('mousemove', setVolume);
    volumeBar.closest('.volume').addEventListener(wheel(), setVolume, false);

    prevBtn.addEventListener('click', prev, false);
    nextBtn.addEventListener('click', next, false);

    apActive = true;

    // Create playlist
    renderPL();
    plBtn.addEventListener('click', plToggle, false);

    // Create audio object
    audio = new Audio();
    audio.volume = settings.volume;
    audio.preload = 'auto';

    audio.addEventListener('error', errorHandler, false);
    audio.addEventListener('timeupdate', timeUpdate, false);
    audio.addEventListener('ended', doEnd, false);

    volumeBar.style.height = audio.volume * 100 + '%';
    volumeLength = volumeBar.css('height');

    if(settings.confirmClose) {
      window.addEventListener("beforeunload", beforeUnload, false);
    }

    if(isEmptyList()) {
      return false;
    }
    audio.src = playList[index].file;
    trackTitle.innerHTML = playList[index].title;
    imgCover.innerHTML = '<img src='+playList[index].cover+'>';

    if(settings.autoPlay) {
      audio.play();
      playBtn.classList.add('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
      plLi[index].classList.add('pl-list--current');
      notify(playList[index].title, {
        icon: playList[index].icon,
        body: 'Now playing'
      });
    }
  }

  function changeDocumentTitle(title) {
    if(settings.changeDocTitle) {
      if(title) {
        document.title = title;
      }
      else {
        document.title = docTitle;
      }
    }
  }

  function beforeUnload(evt) {
    if(!audio.paused) {
      var message = 'Music still playing';
      evt.returnValue = message;
      return message;
    }
  }

  function errorHandler(evt) {
    if(isEmptyList()) {
      return;
    }
    var mediaError = {
      '1': 'MEDIA_ERR_ABORTED',
      '2': 'MEDIA_ERR_NETWORK',
      '3': 'MEDIA_ERR_DECODE',
      '4': 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    };
    audio.pause();
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    plLi[index] && plLi[index].classList.remove('pl-list--current');
    changeDocumentTitle();
    throw new Error('Houston we have a problem: ' + mediaError[evt.target.error.code]);
  }

/**
 * UPDATE PL
 */
  function updatePL(addList) {
    if(!apActive) {
      return 'Player is not yet initialized';
    }
    if(!Array.isArray(addList)) {
      return;
    }
    if(addList.length === 0) {
      return;
    }

    var count = playList.length;
    var html  = [];
    playList.push.apply(playList, addList);
    addList.forEach(function(item) {
      html.push(
        tplList.replace('{count}', count++).replace('{title}', item.title)
      );
    });
    // If exist empty message
    if(plUl.querySelector('.pl-list--empty')) {
      plUl.removeChild( pl.querySelector('.pl-list--empty') );
      audio.src = playList[index].file;
      trackTitle.innerHTML = playList[index].title;
      imgCover.innerHTML = '<img src='+playList[index].cover+'>';
    }
    // Add song into playlist
    plUl.insertAdjacentHTML('beforeEnd', html.join(''));
    plLi = pl.querySelectorAll('li');
  } 

/**
 *  PlayList methods
 */
    function renderPL() {
      var html = [];

      playList.forEach(function(item, i) {
        html.push(
          tplList.replace('{count}', i).replace('{title}', item.title)
        );
      });

      pl = create('div', {
        'className': 'pl-container',
        'id': 'pl',
        'innerHTML': '<ul class="pl-ul">' + (!isEmptyList() ? html.join('') : '<li class="pl-list--empty">PlayList is empty</li>') + '</ul>'
      });

      player.parentNode.insertBefore(pl, player.nextSibling);

      plUl = pl.querySelector('.pl-ul');
      plLi = plUl.querySelectorAll('li');

      pl.addEventListener('click', listHandler, false);
    }

    function listHandler(evt) {
      evt.preventDefault();

      if(evt.target.matches('.pl-list__title')) {
        var current = parseInt(evt.target.closest('.pl-list').getAttribute('data-track'), 10);
        if(index !== current) {
          index = current;
          play(current);
        }
        else {
          playToggle();
        }
      }
      else {
          if(!!evt.target.closest('.pl-list__remove')) 
          {
            var parentEl = evt.target.closest('.pl-list');
            var isDel = parseInt(parentEl.getAttribute('data-track'), 10);

            playList.splice(isDel, 1);
            parentEl.closest('.pl-ul').removeChild(parentEl);

            plLi = pl.querySelectorAll('li');

            [].forEach.call(plLi, function(el, i) {
              el.setAttribute('data-track', i);
            });

            if(!audio.paused) {

              if(isDel === index) {
                play(index);
              }

            }
            else {
              if(isEmptyList()) {
                clearAll();
              }
              else {
                if(isDel === index) {
                  if(isDel > playList.length - 1) {
                    index -= 1;
                  }
                  audio.src = playList[index].file;
                  trackTitle.innerHTML = playList[index].title;
                  imgCover.innerHTML = '<img src='+playList[index].cover+'>';

                  progressBar.style.width = 0;
                }
              }
            }
            if(isDel < index) {
              index--;
            }
          }

      }
    }

    function plActive() {
      if(audio.paused) {
        plLi[index].classList.remove('pl-list--current');
        return;
      }
      var current = index;
      for(var i = 0, len = plLi.length; len > i; i++) {
        plLi[i].classList.remove('pl-list--current');
      }
      plLi[current].classList.add('pl-list--current');
    }


/**
 * Player methods
 */
  function play(currentIndex) {

    if(isEmptyList()) {
      return clearAll();
    }

    index = (currentIndex + playList.length) % playList.length;

    audio.src = playList[index].file;
    trackTitle.innerHTML = playList[index].title;
    imgCover.innerHTML = '<img src='+playList[index].cover+'>';
    // Change document title
    changeDocumentTitle(playList[index].title);

    // Audio play
    audio.play();

    // Show notification
    notify(playList[index].title, {
      icon: playList[index].icon,
      body: 'Now playing',
      tag: 'music-player'
    });

    // Toggle play button
    playBtn.classList.add('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));

    // Set active song playlist
    plActive();
  }

  function prev() {
    play(index - 1);
  }

  function next() {
    play(index + 1);
  }

  function isEmptyList() {
    return playList.length === 0;
  }

  function clearAll() {
    audio.pause();
    audio.src = '';
    trackTitle.innerHTML = 'queue is empty';
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    if(!plUl.querySelector('.pl-list--empty')) {
      plUl.innerHTML = '<li class="pl-list--empty">PlayList is empty</li>';
    }
    changeDocumentTitle();
  }

  function playToggle() {
    if(isEmptyList()) {
      return;
    }
    if(audio.paused) {

      if(audio.currentTime === 0) {
        notify(playList[index].title, {
          icon: playList[index].icon,
          body: 'Now playing'
        });
      }
      changeDocumentTitle(playList[index].title);

      audio.play();

      playBtn.classList.add('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
    }
    else {
      changeDocumentTitle();
      audio.pause();
      playBtn.classList.remove('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    }
    plActive();
  }

  function volumeToggle() {
    if(audio.muted) {
      if(parseInt(volumeLength, 10) === 0) {
        volumeBar.style.height = settings.volume * 100 + '%';
        audio.volume = settings.volume;
      }
      else {
        volumeBar.style.height = volumeLength;
      }
      audio.muted = false;
      volumeBtn.classList.remove('has-muted');
    }
    else {
      audio.muted = true;
      volumeBar.style.height = 0;
      volumeBtn.classList.add('has-muted');
    }
  }

  function repeatToggle() {
    if(repeatBtn.classList.contains('is-active')) {
      repeating = false;
      repeatBtn.classList.remove('is-active');
    }
    else {
      repeating = true;
      repeatBtn.classList.add('is-active');
    }
  }

  function plToggle() {
    plBtn.classList.toggle('is-active');
    pl.classList.toggle('h-show');
  }

  function timeUpdate() {
    if(audio.readyState === 0 || seeking) return;

    var barlength = Math.round(audio.currentTime * (100 / audio.duration));
    progressBar.style.width = barlength + '%';

    var
    curMins = Math.floor(audio.currentTime / 60),
    curSecs = Math.floor(audio.currentTime - curMins * 60),
    mins = Math.floor(audio.duration / 60),
    secs = Math.floor(audio.duration - mins * 60);
    (curSecs < 10) && (curSecs = '0' + curSecs);
    (secs < 10) && (secs = '0' + secs);

    curTime.innerHTML = curMins + ':' + curSecs;
    durTime.innerHTML = mins + ':' + secs;

    if(settings.buffered) {
      var buffered = audio.buffered;
      if(buffered.length) {
        var loaded = Math.round(100 * buffered.end(0) / audio.duration);
        preloadBar.style.width = loaded + '%';
      }
    }
  }

  /**
   * TODO shuffle
   */
  function shuffle() {
    if(shuffle) {
      index = Math.round(Math.random() * playList.length);
    }
  }

  function doEnd() {
    if(index === playList.length - 1) {
      if(!repeating) {
        audio.pause();
        plActive();
        playBtn.classList.remove('is-playing');
        playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
        return;
      }
      else {
        play(0);
      }
    }
    else {
      play(index + 1);
    }
  }

  function moveBar(evt, el, dir) {
    var value;
    if(dir === 'horizontal') {
      value = Math.round( ((evt.clientX - el.offset().left) + window.pageXOffset)  * 100 / el.parentNode.offsetWidth);
      el.style.width = value + '%';
      return value;
    }
    else {
      if(evt.type === wheel()) {
        value = parseInt(volumeLength, 10);
        var delta = evt.deltaY || evt.detail || -evt.wheelDelta;
        value = (delta > 0) ? value - 10 : value + 10;
      }
      else {
        var offset = (el.offset().top + el.offsetHeight) - window.pageYOffset;
        value = Math.round((offset - evt.clientY));
      }
      if(value > 100) value = wheelVolumeValue = 100;
      if(value < 0) value = wheelVolumeValue = 0;
      volumeBar.style.height = value + '%';
      return value;
    }
  }

  function handlerBar(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seeking = true;
    !rightClick && progressBar.classList.add('progress__bar--active');
    seek(evt);
  }

  function handlerVol(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seekingVol = true;
    setVolume(evt);
  }

  function seek(evt) {
    evt.preventDefault();
    if(seeking && rightClick === false && audio.readyState !== 0) {
      window.value = moveBar(evt, progressBar, 'horizontal');
    }
  }

  function seekingFalse() {
    if(seeking && rightClick === false && audio.readyState !== 0) {
      audio.currentTime = audio.duration * (window.value / 100);
      progressBar.classList.remove('progress__bar--active');
    }
    seeking = false;
    seekingVol = false;
  }

  function setVolume(evt) {
    evt.preventDefault();
    volumeLength = volumeBar.css('height');
    if(seekingVol && rightClick === false || evt.type === wheel()) {
      var value = moveBar(evt, volumeBar.parentNode, 'vertical') / 100;
      if(value <= 0) {
        audio.volume = 0;
        audio.muted = true;
        volumeBtn.classList.add('has-muted');
      }
      else {
        if(audio.muted) audio.muted = false;
        audio.volume = value;
        volumeBtn.classList.remove('has-muted');
      }
    }
  }

  function notify(title, attr) {
    if(!settings.notification) {
      return;
    }
    if(window.Notification === undefined) {
      return;
    }
    attr.tag = 'AP music player';
    window.Notification.requestPermission(function(access) {
      if(access === 'granted') {
        var notice = new Notification(title.substr(0, 110), attr);
        setTimeout(notice.close.bind(notice), 5000);
      }
    });
  }

/* Destroy method. Clear All */
  function destroy() {
    if(!apActive) return;

    if(settings.confirmClose) {
      window.removeEventListener('beforeunload', beforeUnload, false);
    }

    playBtn.removeEventListener('click', playToggle, false);
    volumeBtn.removeEventListener('click', volumeToggle, false);
    repeatBtn.removeEventListener('click', repeatToggle, false);
    plBtn.removeEventListener('click', plToggle, false);

    progressBar.closest('.progress-container').removeEventListener('mousedown', handlerBar, false);
    progressBar.closest('.progress-container').removeEventListener('mousemove', seek, false);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    volumeBar.closest('.volume').removeEventListener('mousedown', handlerVol, false);
    volumeBar.closest('.volume').removeEventListener('mousemove', setVolume);
    volumeBar.closest('.volume').removeEventListener(wheel(), setVolume);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    prevBtn.removeEventListener('click', prev, false);
    nextBtn.removeEventListener('click', next, false);

    audio.removeEventListener('error', errorHandler, false);
    audio.removeEventListener('timeupdate', timeUpdate, false);
    audio.removeEventListener('ended', doEnd, false);

    // Playlist
    pl.removeEventListener('click', listHandler, false);
    pl.parentNode.removeChild(pl);

    audio.pause();
    apActive = false;
    index = 0;

    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    volumeBtn.classList.remove('has-muted');
    plBtn.classList.remove('is-active');
    repeatBtn.classList.remove('is-active');

    // Remove player from the DOM if necessary
    // player.parentNode.removeChild(player);
  }


/**
 *  Helpers
 */
  function wheel() {
    var wheel;
    if ('onwheel' in document) {
      wheel = 'wheel';
    } else if ('onmousewheel' in document) {
      wheel = 'mousewheel';
    } else {
      wheel = 'MozMousePixelScroll';
    }
    return wheel;
  }

  function extend(defaults, options) {
    for(var name in options) {
      if(defaults.hasOwnProperty(name)) {
        defaults[name] = options[name];
      }
    }
    return defaults;
  }
  function create(el, attr) {
    var element = document.createElement(el);
    if(attr) {
      for(var name in attr) {
        if(element[name] !== undefined) {
          element[name] = attr[name];
        }
      }
    }
    return element;
  }

  Element.prototype.offset = function() {
    var el = this.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    return {
      top: el.top + scrollTop,
      left: el.left + scrollLeft
    };
  };

  Element.prototype.css = function(attr) {
    if(typeof attr === 'string') {
      return getComputedStyle(this, '')[attr];
    }
    else if(typeof attr === 'object') {
      for(var name in attr) {
        if(this.style[name] !== undefined) {
          this.style[name] = attr[name];
        }
      }
    }
  };

  // matches polyfill
  window.Element && function(ElementPrototype) {
      ElementPrototype.matches = ElementPrototype.matches ||
      ElementPrototype.matchesSelector ||
      ElementPrototype.webkitMatchesSelector ||
      ElementPrototype.msMatchesSelector ||
      function(selector) {
          var node = this, nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;
          while (nodes[++i] && nodes[i] != node);
          return !!nodes[i];
      };
  }(Element.prototype);

  // closest polyfill
  window.Element && function(ElementPrototype) {
      ElementPrototype.closest = ElementPrototype.closest ||
      function(selector) {
          var el = this;
          while (el.matches && !el.matches(selector)) el = el.parentNode;
          return el.matches ? el : null;
      };
  }(Element.prototype);

/**
 *  Public methods
 */
  return {
    init: init,
    update: updatePL,
    destroy: destroy
  };

})();

window.AP = AudioPlayer;

})(window);

// TEST: image for web notifications
var iconImage = 'http://funkyimg.com/i/21pX5.png';

AP.init({
  playList: [
{'icon': iconImage, 'title': 'Oliver Heldens - Ibiza 77 (Can You Feel It) (Chocolate Puma Remix) ', 'file': 'https://alexa-soundcloud.now.sh/stream/334161284/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000234531563-ljt9cm-t500x500.jpg'}
      ]
});

document.getElementById('dhSongs').addEventListener('click', function(e) {
e.preventDefault();
    AP.destroy();
  AP.init({
      playList:[
{'icon': iconImage, 'title': 'Record — Новое (03-04-2020)', 'file': 'http://92.255.66.40/tmp_audio/itunes1/record_new_-_2020-04-03.mp3', 'cover': 'http://www.radiorecord.ru/upload/resize_cache/iblock/064/372_372_1/0644d524cc8bfc1470064e9c61a8287d.png'},
{'icon': iconImage, 'title': '‎Oliver Heldens presents Heldeep Radio', 'file': 'http://media.rawvoice.com/oliverheldens/media2-oliverheldens.podtree.com/media/podcast/Heldeep_Radio_303.mp3', 'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts123/v4/fb/7b/53/fb7b53fe-9be2-f641-c8fa-24b7fadff202/mza_9805097027995531016.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': 'DEL-30 - Soul Back', 'file': 'https://alexa-soundcloud.now.sh/stream/697084672/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000613814552-zckh35-t500x500.jpg'},
{'icon': iconImage, 'title': 'IGA - Sun Glitters (Original Mix) [Track Of The Week 30]', 'file': 'https://alexa-soundcloud.now.sh/stream/275271220/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000173208757-o6wcvm-t500x500.jpg'},
{'icon': iconImage, 'title': 'Nightlapse - Blackout At Roswell', 'file': 'https://alexa-soundcloud.now.sh/stream/771333025/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-zyZaNuZm8dN0twcI-NPgWlA-t500x500.jpg'},
{'icon': iconImage, 'title': 'Cheat Codes x Afrojack - Ferrari (Throwdown Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/654688121/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000570827795-rm2irw-t500x500.jpg'},
{'icon': iconImage, 'title': 'Benny Benassi Feat. BullySongs - Universe (Patrick Hagenaar Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/296809363/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000197405645-g0aa0x-t500x500.jpg'},
{'icon': iconImage, 'title': 'Alpharock & RetroVision - Rockin', 'file': 'https://alexa-soundcloud.now.sh/stream/345154300/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000245393032-wnqh0h-t500x500.jpg'},
{'icon': iconImage, 'title': 'David Hohme - Soft Landing (Jody Wisternoff & James Grant Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/435976272/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000341331984-omqb9z-t500x500.jpg'},
{'icon': iconImage, 'title': 'EDX - Dharma [Enormous Tunes] ', 'file': 'https://alexa-soundcloud.now.sh/stream/305632247/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000205790415-o1o8r6-t500x500.jpg'},
{'icon': iconImage, 'title': 'The Knocks - Collect My Love Feat. Alex Newell (Lenno Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/220820433/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000127452902-rvud34-t500x500.jpg'},
{'icon': iconImage, 'title': 'Justin Caruso - Dont Know You (feat. Jake Miller) [IANY Remix]', 'file': 'https://alexa-soundcloud.now.sh/stream/553728183/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000466889688-exyfrc-t500x500.jpg'},
{'icon': iconImage, 'title': 'Dansson & Marlon Hoffstadt - Shake That (Mark Knight Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/138861877/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000073122602-62t4a1-t500x500.jpg'},
{'icon': iconImage, 'title': 'Kaskade - What You Are To Me (2010 Re-Master)', 'file': 'https://alexa-soundcloud.now.sh/stream/6413433/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000002759658-fm5dkd-t500x500.jpg'},
{'icon': iconImage, 'title': 'Calvin Harris & Example - Well Be Coming Back (R3hab EDC NYC Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/49620628/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000025044180-6at2hd-t500x500.jpg'},
{'icon': iconImage, 'title': 'Kaskade - Sweet Love ft Joslyn', 'file': 'https://alexa-soundcloud.now.sh/stream/172186683/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000094010165-lfqjl8-t500x500.jpg'},
{'icon': iconImage, 'title': 'Dezza & Lee Fraser - Safari ', 'file': 'https://alexa-soundcloud.now.sh/stream/343936843/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000244199251-jnha74-t500x500.jpg'},
{'icon': iconImage, 'title': 'R3hab & Trevor Guthrie - Soundwave (VINAI Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/170893210/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000093116092-aepdf0-t500x500.jpg'},
{'icon': iconImage, 'title': 'Westseven - Lost Language feat. Ross Farren', 'file': 'https://alexa-soundcloud.now.sh/stream/683419205/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000600042326-2lhp7t-t500x500.jpg'},
{'icon': iconImage, 'title': 'Gacha Bakradze - Image', 'file': 'https://alexa-soundcloud.now.sh/stream/464540223/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000366107139-9b0m0e-t500x500.jpg'},
{'icon': iconImage, 'title': 'DEL-30 - Soul Back', 'file': 'https://alexa-soundcloud.now.sh/stream/697084672/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000613814552-zckh35-t500x500.jpg'},
{'icon': iconImage, 'title': 'Landis - Back 2 Me', 'file': 'https://alexa-soundcloud.now.sh/stream/780374131/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-JmkHN3LHHsof83zE-iIgZUw-t500x500.jpg'},
{'icon': iconImage, 'title': 'Missy Elliott - WTF (Where They From) (feat. Pharrell Williams) (Chris Lake Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/260081176/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000159118830-kydfyy-t500x500.jpg'},
{'icon': iconImage, 'title': 'Christopher Damas - ELEVATION ', 'file': 'https://alexa-soundcloud.now.sh/stream/706359790/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000627977836-6ffz5g-t500x500.jpg'},
{'icon': iconImage, 'title': 'Yotto - Wilderness Girl (Undercatt Remix) [Premiered by Pete Tong on BBC Radio 1]', 'file': 'https://alexa-soundcloud.now.sh/stream/334740602/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000235093981-wme27b-t500x500.jpg'},
{'icon': iconImage, 'title': 'Croquet Club - You Left Me', 'file': 'https://alexa-soundcloud.now.sh/stream/265705105/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000164270187-dv1eb6-t500x500.jpg'},
{'icon': iconImage, 'title': 'Kaskade - We Dont Stop (BURNS Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/238150641/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000140038819-jrfhpv-t500x500.jpg'},
{'icon': iconImage, 'title': 'Kaskade vs. Patric la Funk & DBN -Please Say Quick Quack', 'file': 'https://alexa-soundcloud.now.sh/stream/170994743/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000093183210-htj0zo-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ty Dolla $ign - Drop That Kitty Ft. Charli XCX And Tinashe (Ren Phillips Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/223414446/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000129228146-dfw2x1-t500x500.jpg'},
{'icon': iconImage, 'title': 'Oliver Heldens & Throttle - Waiting', 'file': 'https://alexa-soundcloud.now.sh/stream/241425371/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000142720577-mw2bhg-t500x500.jpg'},
{'icon': iconImage, 'title': 'Troye Sivan - Youth (Jerome Price Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/255599256/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000154632041-um0f5r-t500x500.jpg'},
{'icon': iconImage, 'title': 'Croquet Club - Summer', 'file': 'https://alexa-soundcloud.now.sh/stream/268109076/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000166470575-0rmvuf-t500x500.jpg'},
{'icon': iconImage, 'title': 'Nuage - Till U Grow', 'file': 'https://alexa-soundcloud.now.sh/stream/606229797/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000520265844-zxelvj-t500x500.jpg'},
{'icon': iconImage, 'title': 'LP - Other People (Swanky Tunes & Going Deeper Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/298816640/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000199367183-uxny8c-t500x500.jpg'},
{'icon': iconImage, 'title': 'Wynter Gordon - Till Death (R3hab Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/14393196/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000008975229-71u61t-t500x500.jpg'},
{'icon': iconImage, 'title': 'Matisse & Sadko - Memories (DJ Danny Howard Artist Premiere)', 'file': 'https://alexa-soundcloud.now.sh/stream/216554846/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000124500685-sb62lh-t500x500.jpg'},
{'icon': iconImage, 'title': 'Santa Baby (ft. Jane XГ)', 'file': 'https://alexa-soundcloud.now.sh/stream/360462671/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000260827178-4g8po1-t500x500.jpg'},
{'icon': iconImage, 'title': 'CRi - Hidden Places', 'file': 'https://alexa-soundcloud.now.sh/stream/589891344/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000503819403-fkn5dw-t500x500.jpg'},
{'icon': iconImage, 'title': 'Anjunadeep 10 Mini Mix (Mixed by James Grant & Jody Wisternoff)', 'file': 'https://alexa-soundcloud.now.sh/stream/579455499/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000493031895-rdj1ex-t500x500.jpg'},
{'icon': iconImage, 'title': 'SLVR - Under Pressure ', 'file': 'https://alexa-soundcloud.now.sh/stream/770737345/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-yfCXRNLAeQZpNoza-YRh8zA-t500x500.jpg'},
{'icon': iconImage, 'title': 'Kaskade - We Dont Stop (Elk Roads Late Night Drive Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/238150670/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000140038843-gdjpow-t500x500.jpg'},
{'icon': iconImage, 'title': 'NGTY & ALEV - What We Had', 'file': 'https://alexa-soundcloud.now.sh/stream/557929779/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000470816280-zjz4vw-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ferdinand Weber - What (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/203834571/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000115565338-v5vqc9-t500x500.jpg'},
{'icon': iconImage, 'title': 'Alex Metric & Ten Ven - Otic', 'file': 'https://alexa-soundcloud.now.sh/stream/406950309/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000309507942-x9zzdr-t500x500.jpg'},
{'icon': iconImage, 'title': 'AFSHeeN - Dancing With You ', 'file': 'https://alexa-soundcloud.now.sh/stream/731276242/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000655855666-yn6prn-t500x500.jpg'},
{'icon': iconImage, 'title': '\"Free\" Feat. Emeli SandГ© [Jack Beats Remix]', 'file': 'https://alexa-soundcloud.now.sh/stream/115522669/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'ul'},
{'icon': iconImage, 'title': 'Jack Wins - We Are Diamonds (feat. MPH) [CASSIMM Remix] ', 'file': 'https://alexa-soundcloud.now.sh/stream/783588796/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-fGiyoRtlU4ZwiUfQ-zUbJtA-t500x500.jpg'},
{'icon': iconImage, 'title': 'Powerless feat. Becky Hill', 'file': 'https://alexa-soundcloud.now.sh/stream/93116904/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000048541694-on9eof-t500x500.jpg'},
{'icon': iconImage, 'title': 'Tell Me (feat. Late Night Alumni)', 'file': 'https://alexa-soundcloud.now.sh/stream/340488191/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000240858583-yaz0xb-t500x500.jpg'},
{'icon': iconImage, 'title': 'Sam Feldt - Post Malone (feat. RANI) (Cat Dealers Remix) ', 'file': 'https://alexa-soundcloud.now.sh/stream/673143698/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000589740857-dieyv7-t500x500.jpg'},
{'icon': iconImage, 'title': 'Martin Garrix vs Matisse & Sadko - Dragon (Radio Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/213814838/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000122612839-zinr9w-t500x500.jpg'},
{'icon': iconImage, 'title': 'Baggi ft. Micky Blue - Dive (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/184569526/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000102338738-pla9ak-t500x500.jpg'},
{'icon': iconImage, 'title': 'Stadiumx & Metrush - Do It Again ft. BISHГP', 'file': 'https://alexa-soundcloud.now.sh/stream/474255090/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000376838166-6igrrs-t500x500.jpg'},
{'icon': iconImage, 'title': 'Gregori Klosman вЂ“ Time To Be Alone ft Sarah Mount (FromDropTillDawn Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/206249801/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000117351781-ofhif6-t500x500.jpg'},
]})
});
document.getElementById('trSongs').addEventListener('click', function(e) {e.preventDefault();AP.destroy();AP.init({playList:[
{'icon': iconImage, 'title': 'DJ Aramis Trance Global Podcast', 'file': 'http://feeds.soundcloud.com/stream/793766185-djaramis-1-dj-aramis-trance-nations-508-dj-aramis.mp3', 'cover': 'http://i1.sndcdn.com/artworks-9wVmgS7O0R381vFs-cCYITg-t500x500.jpg'},
{'icon': iconImage, 'title': 'Feel ', 'file': 'http://92.255.66.40/tmp_audio/itunes1/feel_-_rc_2020-04-07_320.mp3', 'cover': 'https://cdn.promodj.com/afs/6c4e618a688a45f6aa65ccba6020190512:resize:900x900:same:promodj:e9011b'},
{'icon': iconImage, 'title': 'A State Of Trance Episode 276', 'file': 'https://archive.org/download/Armin_van_Buuren_A_State_of_Trance_001-499/Armin_van_Buuren_A_State_of_Trance_Episode_276.mp3', 'cover': 'https://d1fuks2cnuq5t9.cloudfront.net/i/6WKc8vl3oVtDb8iePwyNaIXoIncsAa2wC2Z6dYgi.jpg'},
{'icon': iconImage, 'title': '01_No Ones To Blame (featuring Sub Teal)', 'file': 'https://alexa-soundcloud.now.sh/stream/747880981/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000672581980-gh3c7i-t500x500.jpg'},
{'icon': iconImage, 'title': 'Michael Woods - Gold ', 'file': 'https://alexa-soundcloud.now.sh/stream/275892396/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000173851666-516y6g-t500x500.jpg'},
{'icon': iconImage, 'title': 'PsyShark - Colorized Sound Energy (PsyTrance', 'file': 'https://alexa-soundcloud.now.sh/stream/270811787/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000168951273-h681gz-t500x500.jpg'},
{'icon': iconImage, 'title': 'Greg Downey - Infinity - FSOE', 'file': 'https://alexa-soundcloud.now.sh/stream/682809374/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000599450771-v09g6f-t500x500.jpg'},
{'icon': iconImage, 'title': 'A & Z vs. Allen & Envy - Osiris ()', 'file': 'https://alexa-soundcloud.now.sh/stream/150297856/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000079899717-zz1228-t500x500.jpg'},
{'icon': iconImage, 'title': 'Alex Di Stefano - Shai (Original Mix) - Preview -', 'file': 'https://alexa-soundcloud.now.sh/stream/9085057/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000007094472-j9cg2t-t500x500.jpg'},
{'icon': iconImage, 'title': 'Forerunners - Prism', 'file': 'https://alexa-soundcloud.now.sh/stream/293293180/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000193833520-p3sl9i-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lewis Gate - Sonic Boom [Clandestine]', 'file': 'https://alexa-soundcloud.now.sh/stream/786751813/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000715800118-5st331-t500x500.jpg'},
{'icon': iconImage, 'title': '[!] Petr Vojacek - Dont Look Back (Original Mix) [TAR Oasis]', 'file': 'https://alexa-soundcloud.now.sh/stream/679141290/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000595797942-ktgnhd-t500x500.jpg'},
{'icon': iconImage, 'title': 'Bryan Kearney - Te Amo (Amir Hussain Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/219765423/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000126725697-9rdf13-t500x500.jpg'},
{'icon': iconImage, 'title': '[!] Andy Kern - Aurora (Original Mix) [TAR#138]', 'file': 'https://alexa-soundcloud.now.sh/stream/691734523/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000608302747-8ulqo9-t500x500.jpg'},
{'icon': iconImage, 'title': 'Gabriel & Dresden feat. Centre - Remember (Wherefore Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/787519663/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-m7yHis9wNtHNGa4S-rqtNIA-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jaytech - Rocinante', 'file': 'https://alexa-soundcloud.now.sh/stream/338415559/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000238842680-9nrhkr-t500x500.jpg'},
{'icon': iconImage, 'title': 'Thomas Datt - The Love Frequency', 'file': 'https://alexa-soundcloud.now.sh/stream/326504307/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000226509345-0oxyik-t500x500.jpg'},
{'icon': iconImage, 'title': 'Tanquilla (Fabian Schumann Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/255867677/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-nQSM5iO4Cwp2-0-t500x500.png'},
{'icon': iconImage, 'title': 'AEG - A New Day', 'file': 'https://alexa-soundcloud.now.sh/stream/761084965/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-y4SpzD0d8t73VAKr-m3yhPA-t500x500.jpg'},
{'icon': iconImage, 'title': 'Liam Melly & Ciaran Dolan - Pea Sauce [FSOE Clandestine]', 'file': 'https://alexa-soundcloud.now.sh/stream/700965715/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000620439289-r0nj2a-t500x500.jpg'},
{'icon': iconImage, 'title': 'Warren Adam - Air Punch', 'file': 'https://alexa-soundcloud.now.sh/stream/243366487/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000144247367-2uutbr-t500x500.jpg'},
{'icon': iconImage, 'title': 'D-Nox & K.A.L.I.L. - Stingray [UV]', 'file': 'https://alexa-soundcloud.now.sh/stream/712116163/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000636592051-di22cg-t500x500.jpg'},
{'icon': iconImage, 'title': 'Amir Hussain - Dharma [FSOE Parallels]', 'file': 'https://alexa-soundcloud.now.sh/stream/739165285/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000663218998-ovksgt-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren vs Human Resource - Dominator (Tom Staar Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/292083017/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-N9Wy69i1TraF-0-t500x500.png'},
{'icon': iconImage, 'title': 'Tinlicker - When The Light Fades (Tom Zeta Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/784455997/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-zBszyUzySxQYaHsO-zEW5kg-t500x500.jpg'},
{'icon': iconImage, 'title': 'Alex Wright - The Vixen & The Lioness', 'file': 'https://alexa-soundcloud.now.sh/stream/343468025/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000243762266-ulsk2s-t500x500.jpg'},
{'icon': iconImage, 'title': 'FEEL - Not Alone (Three Friends) (Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/335248700/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-jkHDmWKGrSiH-0-t500x500.png'},
{'icon': iconImage, 'title': 'Manitu (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/255867746/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-ruejsk3dkB2Y-0-t500x500.png'},
{'icon': iconImage, 'title': 'Aly & Fila With Philippe El Sisi & Omar Sherif - A World Beyond (FSOE 550 Anthem) [FSOE]', 'file': 'https://alexa-soundcloud.now.sh/stream/495467316/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000400201239-vpb9r3-t500x500.jpg'},
{'icon': iconImage, 'title': 'Phunk Investigation - Blade Scanner (Alex Di Stefano Remix) - Preview -', 'file': 'https://alexa-soundcloud.now.sh/stream/12084082/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000007586303-tw3pqf-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. Sam Martin - Wild Wild Son', 'file': 'https://alexa-soundcloud.now.sh/stream/509725560/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-FfelJpqdSxq1-0-t500x500.png'},
{'icon': iconImage, 'title': 'Orjan Nilsen feat. Senadee - Hands (Noah Neiman Remix) ', 'file': 'https://alexa-soundcloud.now.sh/stream/254111209/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000153083010-pwhgws-t500x500.jpg'},
{'icon': iconImage, 'title': 'Hiromori Aso - You Are Not Alone (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/283198367/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000182901716-7xu7jj-t500x500.jpg'},
{'icon': iconImage, 'title': '! Klauss Goulart - Swing Back (Original Mix) [Black Hole 707]', 'file': 'https://alexa-soundcloud.now.sh/stream/206038590/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000117198492-hc5e5i-t500x500.jpg'},
{'icon': iconImage, 'title': 'Boom Jinx & The Blizzard - Senja (The Blizzards Midnight Sun Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/331507559/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000231933062-ex88km-t500x500.jpg'},
{'icon': iconImage, 'title': 'Smith & Brown - Tilt [FSOE Clandestine]', 'file': 'https://alexa-soundcloud.now.sh/stream/526086855/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000435341301-7l4cbz-t500x500.jpg'},
{'icon': iconImage, 'title': 'Breeder - Twilo Thunder (Greg Downey Remix) - Skullduggery', 'file': 'https://alexa-soundcloud.now.sh/stream/334175296/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000234544202-fdah92-t500x500.jpg'},
{'icon': iconImage, 'title': 'Above & Beyond feat. Richard Bedford - Northern Soul (Ben BoМ€hmer Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/401958804/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000304977519-y5nulj-t500x500.jpg'},
{'icon': iconImage, 'title': 'We Are Tonight (Club Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/114878192/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-nXhe8GsA4okZ-0-t500x500.png'},
{'icon': iconImage, 'title': 'The Saw (Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/309958651/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-lX2HVHh677DK-0-t500x500.png'},
{'icon': iconImage, 'title': 'Armin van Buuren - We Are Here To Make Some Noise (Antillas & Dankann Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/289302220/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-rR4qs5VZ93FJ-0-t500x500.png'},
{'icon': iconImage, 'title': 'alt-J - Breezeblocks (Tinlicker Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/667933805/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000584573486-hla0wb-t500x500.jpg'},
{'icon': iconImage, 'title': 'Madwave & Exouler - Miracle [FSOE]', 'file': 'https://alexa-soundcloud.now.sh/stream/520210122/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000428718579-2ddl3n-t500x500.jpg'},
{'icon': iconImage, 'title': 'Still With Me (Keeno Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/255867526/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-rOrhudWt5iH6-0-t500x500.png'},
{'icon': iconImage, 'title': 'Jochen Miller & Cuebrick - In The Dark (Dschafar Remix) ', 'file': 'https://alexa-soundcloud.now.sh/stream/279959799/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000178788790-g93w99-t500x500.jpg'},
{'icon': iconImage, 'title': 'AVACH004 - Somna & Jennifer Rene - Awakening (Michael L Chillout Mix) *Out Now*', 'file': 'https://alexa-soundcloud.now.sh/stream/666855893/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000583519001-v12vfr-t500x500.jpg'},
{'icon': iconImage, 'title': 'Andy Bianchini - Galapagos (Chen Kai Bin Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/158415923/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000084989452-pxucpd-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren - Save My Night (Allen Watts Remix) [A State Of Trance 650 - Part 3]', 'file': 'https://alexa-soundcloud.now.sh/stream/134666026/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000070773657-jwr2fi-t500x500.jpg'},
{'icon': iconImage, 'title': 'System F - Together (Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/232106540/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000135443730-1yqkai-t500x500.jpg'},
{'icon': iconImage, 'title': 'This Will Be Your Happyness (Steve Brian Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/192139138/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-go6O1kiHrFpz-0-t500x500.png'},
{'icon': iconImage, 'title': 'Giuseppe Ottaviani - Crossing Lights (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/226106412/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000131083060-sng8qs-t500x500.jpg'},
{'icon': iconImage, 'title': '[!] Arman Bas - Without Truce (Original Mix) [TAR#138]', 'file': 'https://alexa-soundcloud.now.sh/stream/603305709/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000517464240-8pub9e-t500x500.jpg'},
{'icon': iconImage, 'title': 'Spencer Brown feat. Paperwhite - Chance On Us', 'file': 'https://alexa-soundcloud.now.sh/stream/751594078/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000676479904-l6i5es-t500x500.jpg'},
{'icon': iconImage, 'title': 'James Dymond - Defector', 'file': 'https://alexa-soundcloud.now.sh/stream/262294130/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000161201865-nqmxss-t500x500.jpg'},
{'icon': iconImage, 'title': 'All Night', 'file': 'https://alexa-soundcloud.now.sh/stream/343454324/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000243748463-6kxve2-t500x500.jpg'},
{'icon': iconImage, 'title': 'PsyShark - Colorized Sound Energy (PsyTrance', 'file': 'https://alexa-soundcloud.now.sh/stream/270811787/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000168951273-h681gz-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ben BГ¶hmer & Wood - Reflection ft. Margret', 'file': 'https://alexa-soundcloud.now.sh/stream/571640013/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000484764738-akpmsq-t500x500.jpg'},
{'icon': iconImage, 'title': 'Bobina & Kyle Richardson - Love Is The Answer (Dimension Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/268133844/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000166493735-8k93xj-t500x500.jpg'},
{'icon': iconImage, 'title': 'Indecent Noise pres. Raw Tech Audio - Kingpin', 'file': 'https://alexa-soundcloud.now.sh/stream/344589745/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000244874200-aqz9j1-t500x500.jpg'},
]})
});
document.getElementById('rrSongs').addEventListener('click', function(e) {e.preventDefault();AP.destroy();AP.init({playList:[
{'icon': iconImage, 'title': 'Masha Luxe-Dont Stop(Original Mix)', 'file': 'http://promodj.com/download/6968283/Masha%20Luxe-Don%27t%20Stop%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Cream Soda - Никаких больше вечеринок (DJ Miller Remix)', 'file': 'http://promodj.com/download/6867151/Cream%20Soda%20-%20%D0%9D%D0%B8%D0%BA%D0%B0%D0%BA%D0%B8%D1%85%20%D0%B1%D0%BE%D0%BB%D1%8C%D1%88%D0%B5%20%D0%B2%D0%B5%D1%87%D0%B5%D1%80%D0%B8%D0%BD%D0%BE%D0%BA%20%28DJ%20Miller%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lana Del Rey - Young & Beautiful (A-Mase Nudisco Remix)', 'file': 'http://promodj.com/download/6890728/Lana%20Del%20Rey%20-%20Young%20%26%20Beautiful%20%28A-Mase%20Nudisco%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Наталия Иванова - Давай Сбежим (Dirty Stab Remix)', 'file': 'http://promodj.com/download/6893451/%D0%9D%D0%B0%D1%82%D0%B0%D0%BB%D0%B8%D1%8F%20%D0%98%D0%B2%D0%B0%D0%BD%D0%BE%D0%B2%D0%B0%20-%20%D0%94%D0%B0%D0%B2%D0%B0%D0%B9%20%D0%A1%D0%B1%D0%B5%D0%B6%D0%B8%D0%BC%20%28Dirty%20Stab%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Raim & Artur - Полетаем (D&S Project Radio Edit)', 'file': 'http://promodj.com/download/6979665/Raim%20%26%20Artur%20-%20%D0%9F%D0%BE%D0%BB%D0%B5%D1%82%D0%B0%D0%B5%D0%BC%20%28D%26S%20Project%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Artik & Asti - Девочка Танцуй (Frost & Stanislav Almazov Radio Remix)', 'file': 'http://promodj.com/download/6976928/Artik%20%26%20Asti%20-%20%D0%94%D0%B5%D0%B2%D0%BE%D1%87%D0%BA%D0%B0%20%D0%A2%D0%B0%D0%BD%D1%86%D1%83%D0%B9%20%28Frost%20%26%20Stanislav%20Almazov%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Serge Legran & Dj Dimixer - Bam Barabam (Max Bestler & Roman Kuskoff Radio Remix)', 'file': 'http://promodj.com/download/6960210/Serge%20Legran%20%26%20Dj%20Dimixer%20-%20Bam%20Barabam%20%28Max%20Bestler%20%26%20Roman%20Kuskoff%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Bahh Tee feat. Люся Чеботина - Дисконнект (RASEVAN Remix) (Radio Edit)', 'file': 'http://promodj.com/download/6975668/Bahh%20Tee%20feat.%20%D0%9B%D1%8E%D1%81%D1%8F%20%D0%A7%D0%B5%D0%B1%D0%BE%D1%82%D0%B8%D0%BD%D0%B0%20-%20%D0%94%D0%B8%D1%81%D0%BA%D0%BE%D0%BD%D0%BD%D0%B5%D0%BA%D1%82%20%28RASEVAN%20Remix%29%20%28Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'NЮ - Веснушки (Ice Remix)', 'file': 'http://promodj.com/download/6902076/N%D0%AE%20-%20%D0%92%D0%B5%D1%81%D0%BD%D1%83%D1%88%D0%BA%D0%B8%20%28Ice%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Время и Стекло - Навсегда Никогда (Andrew Boy remix)', 'file': 'http://promodj.com/download/6968090/%D0%92%D1%80%D0%B5%D0%BC%D1%8F%20%D0%B8%20%D0%A1%D1%82%D0%B5%D0%BA%D0%BB%D0%BE%20-%20%D0%9D%D0%B0%D0%B2%D1%81%D0%B5%D0%B3%D0%B4%D0%B0%20%D0%9D%D0%B8%D0%BA%D0%BE%D0%B3%D0%B4%D0%B0%20%28Andrew%20Boy%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Artik & Asti - Девочка Танцуй (Frost & Stanislav Almazov Radio Remix)', 'file': 'http://promodj.com/download/6976928/Artik%20%26%20Asti%20-%20%D0%94%D0%B5%D0%B2%D0%BE%D1%87%D0%BA%D0%B0%20%D0%A2%D0%B0%D0%BD%D1%86%D1%83%D0%B9%20%28Frost%20%26%20Stanislav%20Almazov%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'roberto kan - swipe |x buzova|', 'file': 'http://promodj.com/download/6977528/roberto%20kan%20-%20swipe%20%7Cx%20buzova%7C%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Леша Свик & Zivert & Kolya Funk & Shnaps vs. Major & Rakurs - Светофоры (Mixon Spencer & Kuriev Mixshow)', 'file': 'http://promodj.com/download/6981804/%D0%9B%D0%B5%D1%88%D0%B0%20%D0%A1%D0%B2%D0%B8%D0%BA%20%26%20Zivert%20%26%20Kolya%20Funk%20%26%20Shnaps%20vs.%20Major%20%26%20Rakurs%20-%20%D0%A1%D0%B2%D0%B5%D1%82%D0%BE%D1%84%D0%BE%D1%80%D1%8B%20%28Mixon%20Spencer%20%26%20Kuriev%20Mixshow%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'DJ JEDY feat VITA - Всё идёт по плану ( Егор Летов Deep cover )', 'file': 'http://promodj.com/download/6830732/DJ%20JEDY%20feat%20VITA%20-%20%D0%92%D1%81%D1%91%20%D0%B8%D0%B4%D1%91%D1%82%20%D0%BF%D0%BE%20%D0%BF%D0%BB%D0%B0%D0%BD%D1%83%20%28%20%D0%95%D0%B3%D0%BE%D1%80%20%D0%9B%D0%B5%D1%82%D0%BE%D0%B2%20Deep%20cover%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Дискотека Авария – КОУЧ (Fresh n Funky Remix)', 'file': 'http://promodj.com/download/6854907/%D0%94%D0%B8%D1%81%D0%BA%D0%BE%D1%82%D0%B5%D0%BA%D0%B0%20%D0%90%D0%B2%D0%B0%D1%80%D0%B8%D1%8F%20%E2%80%93%20%D0%9A%D0%9E%D0%A3%D0%A7%20%28Fresh%20%27n%27%20Funky%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Zivert ЯТЛ (DJ JON Radio Edit)', 'file': 'http://promodj.com/download/6971712/Zivert%20%D0%AF%D0%A2%D0%9B%20%28DJ%20JON%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Sound Of Legend - Sweet Dreams (Mixon Spencer & Butesha Remix)', 'file': 'http://promodj.com/download/6978502/Sound%20Of%20Legend%20-%20Sweet%20Dreams%20%28Mixon%20Spencer%20%26%20Butesha%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ассорти - Большие Девочки ( demoan remiX)', 'file': 'http://promodj.com/download/6916721/%D0%90%D1%81%D1%81%D0%BE%D1%80%D1%82%D0%B8%20-%20%D0%91%D0%BE%D0%BB%D1%8C%D1%88%D0%B8%D0%B5%20%D0%94%D0%B5%D0%B2%D0%BE%D1%87%D0%BA%D0%B8%20%28%20demoan%20remiX%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Тимур Timbigfamily - Напиться надо (Mikis & StaRs Remix)', 'file': 'http://promodj.com/download/6824238/%D0%A2%D0%B8%D0%BC%D1%83%D1%80%20Timbigfamily%20-%20%D0%9D%D0%B0%D0%BF%D0%B8%D1%82%D1%8C%D1%81%D1%8F%20%D0%BD%D0%B0%D0%B4%D0%BE%20%28Mikis%20%26%20StaR%27s%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Just-V@Li 125bpm', 'file': 'http://promodj.com/download/6980647/Just-V%40Li%20125bpm%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Nester - Interruption', 'file': 'http://promodj.com/download/6967118/Nester%20-%20Interruption%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'JENNY - SOLO(COVER Marcus Dielen Remix)', 'file': 'http://promodj.com/download/6974143/JENNY%20-%20SOLO%28COVER%20Marcus%20Dielen%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Artik & Asti feat. Артем Качер - Грустный Дэнс (Oneon Remix)', 'file': 'http://promodj.com/download/6834798/Artik%20%26%20Asti%20feat.%20%D0%90%D1%80%D1%82%D0%B5%D0%BC%20%D0%9A%D0%B0%D1%87%D0%B5%D1%80%20-%20%D0%93%D1%80%D1%83%D1%81%D1%82%D0%BD%D1%8B%D0%B9%20%D0%94%D1%8D%D0%BD%D1%81%20%28Oneon%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Артём Качер - Одинокая луна (Haskey Radio Remix)', 'file': 'http://promodj.com/download/6967452/%D0%90%D1%80%D1%82%D1%91%D0%BC%20%D0%9A%D0%B0%D1%87%D0%B5%D1%80%20-%20%D0%9E%D0%B4%D0%B8%D0%BD%D0%BE%D0%BA%D0%B0%D1%8F%20%D0%BB%D1%83%D0%BD%D0%B0%20%28Haskey%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Swipe, Semasound - Кальянная леди (Butesha Radio Remix)', 'file': 'http://promodj.com/download/6967950/Swipe%2C%20Semasound%20-%20%D0%9A%D0%B0%D0%BB%D1%8C%D1%8F%D0%BD%D0%BD%D0%B0%D1%8F%20%D0%BB%D0%B5%D0%B4%D0%B8%20%28Butesha%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ofliyan - Prince (83 Happy Remix)', 'file': 'http://promodj.com/download/6981305/Ofliyan%20-%20Prince%20%2883%20Happy%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Trevor Daniel x Eddie G & Misha Maklay & Jurbas - Falling (SAlANDIR Radio Version)', 'file': 'http://promodj.com/download/6976813/Trevor%20Daniel%20x%20Eddie%20G%20%26%20Misha%20Maklay%20%26%20Jurbas%20-%20Falling%20%28SAlANDIR%20Radio%20Version%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Akubeat - ChistoDeep', 'file': 'http://promodj.com/download/6973346/Akubeat%20-%20ChistoDeep%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'КИНАМ - Не бойся ночь', 'file': 'http://promodj.com/download/6976340/%D0%9A%D0%98%D0%9D%D0%90%D0%9C%20-%20%D0%9D%D0%B5%20%D0%B1%D0%BE%D0%B9%D1%81%D1%8F%20%D0%BD%D0%BE%D1%87%D1%8C%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Mary Gu - Дисней (Ruks Remix)', 'file': 'http://promodj.com/download/6979069/Mary%20Gu%20-%20%D0%94%D0%B8%D1%81%D0%BD%D0%B5%D0%B9%20%28Ruks%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'FISHER - Losing It OLè OLè (SKINU V.I.P Mash-Up)', 'file': 'http://promodj.com/download/6975344/FISHER%20-%20Losing%20It%20OL%C3%A8%20OL%C3%A8%20%28SKINU%20V.I.P%20Mash-Up%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ганвест - Кайфули (OldMan Radio Remix)', 'file': 'http://promodj.com/download/6981506/%D0%93%D0%B0%D0%BD%D0%B2%D0%B5%D1%81%D1%82%20-%20%D0%9A%D0%B0%D0%B9%D1%84%D1%83%D0%BB%D0%B8%20%28OldMan%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Моди Глю & Anagramma  MAMBAKA', 'file': 'http://promodj.com/download/5961335/%D0%9C%D0%BE%D0%B4%D0%B8%20%D0%93%D0%BB%D1%8E%20%26%20Anagramma%20%27%20MAMBAKA%27%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Руки Вверх - Так тебе и надо (Минус для караоке) (Dj Micola cover & Aleks Prise Remix 2020)', 'file': 'http://promodj.com/download/6980882/%D0%A0%D1%83%D0%BA%D0%B8%20%D0%92%D0%B2%D0%B5%D1%80%D1%85%20-%20%D0%A2%D0%B0%D0%BA%20%D1%82%D0%B5%D0%B1%D0%B5%20%D0%B8%20%D0%BD%D0%B0%D0%B4%D0%BE%20%28%D0%9C%D0%B8%D0%BD%D1%83%D1%81%20%D0%B4%D0%BB%D1%8F%20%D0%BA%D0%B0%D1%80%D0%B0%D0%BE%D0%BA%D0%B5%29%20%28Dj%20Micola%20cover%20%26%20Aleks%20Prise%20Remix%202020%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'GAYAZOV$ BROTHER$ - Увезите меня на дип-хаус (Lesnichiy Radio Remix)', 'file': 'http://promodj.com/download/6971963/GAYAZOV%24%20BROTHER%24%20-%20%D0%A3%D0%B2%D0%B5%D0%B7%D0%B8%D1%82%D0%B5%20%D0%BC%D0%B5%D0%BD%D1%8F%20%D0%BD%D0%B0%20%D0%B4%D0%B8%D0%BF-%D1%85%D0%B0%D1%83%D1%81%20%28Lesnichiy%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Serebro - Мальчик (KIDO Edit)', 'file': 'http://promodj.com/download/6982718/Serebro%20-%20%D0%9C%D0%B0%D0%BB%D1%8C%D1%87%D0%B8%D0%BA%20%28KIDO%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Bahh Tee feat. Люся Чеботина - Дисконнект (RASEVAN Remix) (Radio Edit)', 'file': 'http://promodj.com/download/6975668/Bahh%20Tee%20feat.%20%D0%9B%D1%8E%D1%81%D1%8F%20%D0%A7%D0%B5%D0%B1%D0%BE%D1%82%D0%B8%D0%BD%D0%B0%20-%20%D0%94%D0%B8%D1%81%D0%BA%D0%BE%D0%BD%D0%BD%D0%B5%D0%BA%D1%82%20%28RASEVAN%20Remix%29%20%28Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Анна Филипчук - Любовь - Война (DJ Baloo Remix)', 'file': 'http://promodj.com/download/6977738/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20-%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C%20-%20%D0%92%D0%BE%D0%B9%D0%BD%D0%B0%20%28DJ%20Baloo%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'The Black Eyed Peas, J Balvin ft Usher - RITMO x Yeah (DJ LiON ft Tina Walen Mashup)', 'file': 'http://promodj.com/download/6973237/The%20Black%20Eyed%20Peas%2C%20J%20Balvin%20ft%20Usher%20-%20RITMO%20x%20Yeah%20%28DJ%20LiON%20ft%20Tina%20Walen%20Mashup%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Анна Филипчук–Любовь-война (Di-Serzh Version 2)', 'file': 'http://promodj.com/download/6980979/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%E2%80%93%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28Di-Serzh%20Version%202%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Elderbrook - Capricorn 2019 (Akhmetoff Mashup)', 'file': 'http://promodj.com/download/6983547/Elderbrook%20-%20Capricorn%202019%20%28Akhmetoff%20Mashup%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'BARINOVA - САМЫЙ-САМЫЙ (Yura West Remix)#2', 'file': 'http://promodj.com/download/6978285/BARINOVA%20-%20%D0%A1%D0%90%D0%9C%D0%AB%D0%99-%D0%A1%D0%90%D0%9C%D0%AB%D0%99%20%28Yura%20West%20Remix%29%232%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Zivert - Credo (Oneon Remix)', 'file': 'http://promodj.com/download/6916956/Zivert%20-%20Credo%20%28Oneon%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chok — I have to say ( Nikolay Lavrentiev Remix )', 'file': 'http://promodj.com/download/6963947/Chok%20%E2%80%94%20I%20have%20to%20say%20%28%20Nikolay%20Lavrentiev%20Remix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Little Big - Im OK (Chad & Eugene Star Extended)', 'file': 'http://promodj.com/download/6884598/Little%20Big%20-%20I%27m%20OK%20%28Chad%20%26%20Eugene%20Star%20Extended%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Wve - Feel The Sex Bass (Original Mix)', 'file': 'http://promodj.com/download/6984507/Wve%20-%20Feel%20The%20Sex%20Bass%20%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Audiosoulz - Dancefloor (Black Toriouz Radio Edit)', 'file': 'http://promodj.com/download/6976753/Audiosoulz%20-%20Dancefloor%20%28Black%20Toriouz%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Анна Филипчук - Любовь-война (BIFF & MAXIM KEKS REMIX)', 'file': 'http://promodj.com/download/6984212/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20-%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28BIFF%20%26%20MAXIM%20KEKS%20REMIX%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Freaky DJs, Flashbird, Alastor Uchiha - If I Am (Slavэ Remix)Radio Edit', 'file': 'http://promodj.com/download/6830119/Freaky%20DJs%2C%20Flashbird%2C%20Alastor%20Uchiha%20-%20If%20I%20Am%20%28Slav%D1%8D%20Remix%29Radio%20Edit%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chok - I Have to Say (Alexander Mosolov Remix)', 'file': 'http://promodj.com/download/6977359/Chok%20-%20I%20Have%20to%20Say%20%28Alexander%20Mosolov%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'GROSU - Vova (XM Remix)', 'file': 'http://promodj.com/download/6801780/GROSU%20-%20Vova%20%28XM%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Мальбэк & Сюзанна - Равнодушие (Dmitriy Exception Radio Edit)', 'file': 'http://promodj.com/download/6978300/%D0%9C%D0%B0%D0%BB%D1%8C%D0%B1%D1%8D%D0%BA%20%26%20%D0%A1%D1%8E%D0%B7%D0%B0%D0%BD%D0%BD%D0%B0%20-%20%D0%A0%D0%B0%D0%B2%D0%BD%D0%BE%D0%B4%D1%83%D1%88%D0%B8%D0%B5%20%28Dmitriy%20Exception%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Юрий Шатунов - Медленно уходит осень (Vostokov Refresh)', 'file': 'http://promodj.com/download/6899374/%D0%AE%D1%80%D0%B8%D0%B9%20%D0%A8%D0%B0%D1%82%D1%83%D0%BD%D0%BE%D0%B2%20-%20%D0%9C%D0%B5%D0%B4%D0%BB%D0%B5%D0%BD%D0%BD%D0%BE%20%D1%83%D1%85%D0%BE%D0%B4%D0%B8%D1%82%20%D0%BE%D1%81%D0%B5%D0%BD%D1%8C%20%28Vostokov%20Refresh%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ace Of Base - The Sign (Dj.Polattt ReMix)', 'file': 'http://promodj.com/download/6976723/Ace%20Of%20Base%20-%20The%20Sign%20%28Dj.Polattt%20ReMix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Quba - Let Me Love You (Original Mix)', 'file': 'http://promodj.com/download/6982259/Quba%20-%20Let%20Me%20Love%20You%20%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'ItaloBrothers - This Is Nightlife (Eddie G Radio Remix)', 'file': 'http://promodj.com/download/6976062/ItaloBrothers%20-%20This%20Is%20Nightlife%20%28Eddie%20G%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Леша Свик - Светофоры ( Mamoru Radio Remix )', 'file': 'http://promodj.com/download/6982419/%D0%9B%D0%B5%D1%88%D0%B0%20%D0%A1%D0%B2%D0%B8%D0%BA%20-%20%D0%A1%D0%B2%D0%B5%D1%82%D0%BE%D1%84%D0%BE%D1%80%D1%8B%20%28%20Mamoru%20Radio%20Remix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'SEREBRO - Мало тебя (remix Mad Temich)', 'file': 'http://promodj.com/download/6981384/SEREBRO%20-%20%D0%9C%D0%B0%D0%BB%D0%BE%20%D1%82%D0%B5%D0%B1%D1%8F%20%28remix%20Mad%20Temich%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'TJR & Calvin Harris & R3HAB ft. Fatman Scoop - Check This (H.D.S 2020 EDIT)', 'file': 'http://promodj.com/download/6981866/TJR%20%26%20Calvin%20Harris%20%26%20R3HAB%20ft.%20Fatman%20Scoop%20-%20Check%20This%20%28H.D.S%202020%20EDIT%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lil Nas X - Old Town Road (Melum Remix)', 'file': 'http://promodj.com/download/6966787/Lil%20Nas%20X%20-%20Old%20Town%20Road%20%28Melum%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
]})
});
document.getElementById('rsSongs').addEventListener('click', function(e) {e.preventDefault();AP.destroy();AP.init({playList:[
{'icon': iconImage, 'title': '‎Transmission Radio', 'file': 'http://audio.thisisdistorted.com/repository/audio/episodes/Transmission_Radio_267_iTunes-1585646859474183987-MzAxMjgtODYzODYwMjA=.mp3', 'cover': 'https://is5-ssl.mzstatic.com/image/thumb/Podcasts113/v4/4a/08/f0/4a08f03c-6f68-7d6b-4cf8-921ddb1ec92c/mza_16117164316925034706.png/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Paul Thomas presents UV Radio', 'file': 'http://feeds.soundcloud.com/stream/788680882-djpaulthomas-paul-thomas-presents-uv-radio-130.mp3', 'cover': 'https://is4-ssl.mzstatic.com/image/thumb/Podcasts113/v4/41/94/84/419484e2-d567-e6f5-8eed-e5c1064f767b/mza_1669091840704367489.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Jaytech Music Podcast', 'file': 'https://mcdn.podbean.com/mf/web/b3r3q3/Jaytech_Music_Podcast_147_-_Unreleased_Tunes_Special_2.mp3', 'cover': 'https://is5-ssl.mzstatic.com/image/thumb/Podcasts123/v4/24/ce/87/24ce8791-b9d7-c33e-5e32-15077f0b87fe/mza_5047330853122380582.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Paul van Dyks VONYC Sessions Podcast', 'file': 'http://audio.thisisdistorted.com/repository/audio/episodes/V700_2_Hour_Show-1585857146603687169-MzAxNTEtMTE5MzU5OTI5.m4a', 'cover': 'https://is5-ssl.mzstatic.com/image/thumb/Podcasts123/v4/13/ba/6a/13ba6a5c-5032-6f1d-545f-2c3aa49a57ea/mza_16237941372195075687.png/552x0w.jpg'},
{'icon': iconImage, 'title': '‎EDXs No Xcuses Podcast', 'file': 'http://traffic.libsyn.com/edxnoxcuses/ENOX476_iTundgjigsgf.mp3?dest-id=64289', 'cover': 'https://is3-ssl.mzstatic.com/image/thumb/Podcasts123/v4/d3/72/f9/d372f9cf-c65c-4394-8c01-e491847e6fe8/mza_13373421473835957718.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Above &amp; Beyond: Group Therapy', 'file': 'http://traffic.libsyn.com/anjunabeats/group-therapy-375-with-above-beyond-and-dylhen.m4a', 'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/49/b8/3b/49b83bc2-8d26-829a-38ef-a9fe992f59dc/mza_3713017386252311615.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Anjunabeats Worldwide', 'file': 'http://traffic.libsyn.com/anjunadeep/Anjunabeats_Worldwide_671_with_Cosmic_Gate.mp3', 'cover': 'https://is3-ssl.mzstatic.com/image/thumb/Podcasts123/v4/c2/b1/84/c2b1843e-026d-f1b2-82bc-195ddc48cc2b/mza_4048134186113672980.png/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Steve Allen Pres Uplift', 'file': 'https://mcdn.podbean.com/mf/web/wzy8ua/Steve_Allen_Pres_Uplift_082.mp3', 'cover': 'https://is2-ssl.mzstatic.com/image/thumb/Podcasts113/v4/51/5c/4c/515c4cd3-3302-2a65-9cff-a678ab6670e4/mza_2024987804034631867.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎The firecastradioshows Podcast', 'file': 'https://mcdn.podbean.com/mf/web/p8drpj/Alex_Di_Stefano_-_FireCast_Radio_049_-_LIVE.mp3', 'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/77/60/64/7760643f-cdc0-0c5a-c3a5-a8116c8838dc/mza_5260858702148483766.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎The Menno de Jong Cloudcast', 'file': 'http://www.mennodejong.com/cloudcast/Menno%20de%20Jong%20Cloudcast%20089%20-%20January%202020%20-%20Yearmix%20\u0026%20Finale.mp3', 'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/91/ca/4c/91ca4cf5-3024-9f11-89fd-991bef291c3f/mza_672176834817290940.png/552x0w.jpg'},
]})
});
