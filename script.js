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
    {'icon': iconImage, 'title': 'AZ2A x Keepin It Heale - Genie In A Bottle', 'file': 'https://alexa-soundcloud.now.sh/stream/775461901/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dray - Surrender', 'file': 'https://alexa-soundcloud.now.sh/stream/767880451/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Pablo Bravas - Numb', 'file': 'https://alexa-soundcloud.now.sh/stream/760485589/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jozels - Uplifted (ft. Jon Hazel)', 'file': 'https://alexa-soundcloud.now.sh/stream/745018153/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'WATEVA - So High', 'file': 'https://alexa-soundcloud.now.sh/stream/723570073/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Zak Joshua - Figure It Out', 'file': 'https://alexa-soundcloud.now.sh/stream/701594881/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'T. Matthias - Would I Lie To You', 'file': 'https://alexa-soundcloud.now.sh/stream/660168113/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Luca Debonaire & The Giver - Put The Work In', 'file': 'https://alexa-soundcloud.now.sh/stream/647814834/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Tom Novy ft. Michael Marshall - Something Special', 'file': 'https://alexa-soundcloud.now.sh/stream/612647403/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Aleks Cameron - Be With U', 'file': 'https://alexa-soundcloud.now.sh/stream/597914601/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JYYE - Dream', 'file': 'https://alexa-soundcloud.now.sh/stream/553485588/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Cureton - Where You Belong', 'file': 'https://alexa-soundcloud.now.sh/stream/503195751/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'LUМ€CKS - First Last Kiss(JYYE Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/499871061/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'RГDY & Guy Gabriel - Fair Shot', 'file': 'https://alexa-soundcloud.now.sh/stream/484966224/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'WATEVA ft. Alia - Amnesia', 'file': 'https://alexa-soundcloud.now.sh/stream/477498579/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'LUМ€CKS ft. Kat Vinter  - First Last Kiss (Calippo Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/471631746/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'CLEIN - Give It To Me', 'file': 'https://alexa-soundcloud.now.sh/stream/470257773/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Nathan Rux - Back To You', 'file': 'https://alexa-soundcloud.now.sh/stream/465039156/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jerome Price - Get Me There', 'file': 'https://alexa-soundcloud.now.sh/stream/449056317/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Kyle Meehan X Delta Jack - Needed You', 'file': 'https://alexa-soundcloud.now.sh/stream/442638714/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Halogen - Time', 'file': 'https://alexa-soundcloud.now.sh/stream/429196587/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Cureton - Lovesick', 'file': 'https://alexa-soundcloud.now.sh/stream/393486222/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Ellis - Fuschia', 'file': 'https://alexa-soundcloud.now.sh/stream/386031239/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dallerium - Need U', 'file': 'https://alexa-soundcloud.now.sh/stream/382594217/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Cureton - Confused (ft. joegarratt)', 'file': 'https://alexa-soundcloud.now.sh/stream/380582459/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Darkness', 'file': 'https://alexa-soundcloud.now.sh/stream/374606726/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Tru Concept x JLV x Nu Aspect - Love You No More', 'file': 'https://alexa-soundcloud.now.sh/stream/373118339/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dallerium - What I Know', 'file': 'https://alexa-soundcloud.now.sh/stream/372207767/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'RIKA ft. THE HIGHESTER - No Need (ZAIO Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/360372353/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'VANRIP & Truth x Lies - What Is Love', 'file': 'https://alexa-soundcloud.now.sh/stream/348864870/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'YNC x S3RIOUS x Fynn - Space', 'file': 'https://alexa-soundcloud.now.sh/stream/333189548/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jerome Price ft. Alex Mills - Nothing Left To Lose', 'file': 'https://alexa-soundcloud.now.sh/stream/327303491/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'ohmyboy & RГёom - Im On Overload', 'file': 'https://alexa-soundcloud.now.sh/stream/324626896/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'TRU Concept & Nu Aspect - Said To You', 'file': 'https://alexa-soundcloud.now.sh/stream/322284779/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Soaring', 'file': 'https://alexa-soundcloud.now.sh/stream/319251714/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Anto - What I Feel', 'file': 'https://alexa-soundcloud.now.sh/stream/314121245/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Nu Aspect - Things I Said', 'file': 'https://alexa-soundcloud.now.sh/stream/310544030/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Words Arent Enough', 'file': 'https://alexa-soundcloud.now.sh/stream/308857926/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jerome Price - Nobody (ft. Karen Harding)', 'file': 'https://alexa-soundcloud.now.sh/stream/308237106/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - All My Life', 'file': 'https://alexa-soundcloud.now.sh/stream/305601075/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Alone', 'file': 'https://alexa-soundcloud.now.sh/stream/302371892/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'No Hopes ft. Kinspin - Changes', 'file': 'https://alexa-soundcloud.now.sh/stream/300328918/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dave Silcox & Kvdos -  Broken Promises (ft. Little Nikki)', 'file': 'https://alexa-soundcloud.now.sh/stream/291513875/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Liv Dawson - Reflection (MI10M Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/289015841/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Alec Maire - Azuka', 'file': 'https://alexa-soundcloud.now.sh/stream/282427533/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'}
      ]
});
// TEST: update playlist
document.getElementById('dhSongs').addEventListener('click', function(e) {
e.preventDefault();
    AP.destroy();
  AP.init({
      playList:[
{'icon': iconImage, 'title': 'AZ2A x Keepin It Heale - Genie In A Bottle', 'file': 'https://alexa-soundcloud.now.sh/stream/775461901/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dray - Surrender', 'file': 'https://alexa-soundcloud.now.sh/stream/767880451/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Pablo Bravas - Numb', 'file': 'https://alexa-soundcloud.now.sh/stream/760485589/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jozels - Uplifted (ft. Jon Hazel)', 'file': 'https://alexa-soundcloud.now.sh/stream/745018153/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'WATEVA - So High', 'file': 'https://alexa-soundcloud.now.sh/stream/723570073/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Zak Joshua - Figure It Out', 'file': 'https://alexa-soundcloud.now.sh/stream/701594881/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'T. Matthias - Would I Lie To You', 'file': 'https://alexa-soundcloud.now.sh/stream/660168113/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Luca Debonaire & The Giver - Put The Work In', 'file': 'https://alexa-soundcloud.now.sh/stream/647814834/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Tom Novy ft. Michael Marshall - Something Special', 'file': 'https://alexa-soundcloud.now.sh/stream/612647403/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Aleks Cameron - Be With U', 'file': 'https://alexa-soundcloud.now.sh/stream/597914601/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JYYE - Dream', 'file': 'https://alexa-soundcloud.now.sh/stream/553485588/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Cureton - Where You Belong', 'file': 'https://alexa-soundcloud.now.sh/stream/503195751/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'LUМ€CKS - First Last Kiss(JYYE Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/499871061/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'RГDY & Guy Gabriel - Fair Shot', 'file': 'https://alexa-soundcloud.now.sh/stream/484966224/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'WATEVA ft. Alia - Amnesia', 'file': 'https://alexa-soundcloud.now.sh/stream/477498579/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'LUМ€CKS ft. Kat Vinter  - First Last Kiss (Calippo Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/471631746/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'CLEIN - Give It To Me', 'file': 'https://alexa-soundcloud.now.sh/stream/470257773/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Nathan Rux - Back To You', 'file': 'https://alexa-soundcloud.now.sh/stream/465039156/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jerome Price - Get Me There', 'file': 'https://alexa-soundcloud.now.sh/stream/449056317/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Kyle Meehan X Delta Jack - Needed You', 'file': 'https://alexa-soundcloud.now.sh/stream/442638714/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Halogen - Time', 'file': 'https://alexa-soundcloud.now.sh/stream/429196587/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Cureton - Lovesick', 'file': 'https://alexa-soundcloud.now.sh/stream/393486222/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Ellis - Fuschia', 'file': 'https://alexa-soundcloud.now.sh/stream/386031239/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dallerium - Need U', 'file': 'https://alexa-soundcloud.now.sh/stream/382594217/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Cureton - Confused (ft. joegarratt)', 'file': 'https://alexa-soundcloud.now.sh/stream/380582459/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Darkness', 'file': 'https://alexa-soundcloud.now.sh/stream/374606726/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Tru Concept x JLV x Nu Aspect - Love You No More', 'file': 'https://alexa-soundcloud.now.sh/stream/373118339/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dallerium - What I Know', 'file': 'https://alexa-soundcloud.now.sh/stream/372207767/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'RIKA ft. THE HIGHESTER - No Need (ZAIO Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/360372353/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'VANRIP & Truth x Lies - What Is Love', 'file': 'https://alexa-soundcloud.now.sh/stream/348864870/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'YNC x S3RIOUS x Fynn - Space', 'file': 'https://alexa-soundcloud.now.sh/stream/333189548/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jerome Price ft. Alex Mills - Nothing Left To Lose', 'file': 'https://alexa-soundcloud.now.sh/stream/327303491/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'ohmyboy & RГёom - Im On Overload', 'file': 'https://alexa-soundcloud.now.sh/stream/324626896/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'TRU Concept & Nu Aspect - Said To You', 'file': 'https://alexa-soundcloud.now.sh/stream/322284779/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Soaring', 'file': 'https://alexa-soundcloud.now.sh/stream/319251714/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Anto - What I Feel', 'file': 'https://alexa-soundcloud.now.sh/stream/314121245/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Nu Aspect - Things I Said', 'file': 'https://alexa-soundcloud.now.sh/stream/310544030/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Words Arent Enough', 'file': 'https://alexa-soundcloud.now.sh/stream/308857926/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Jerome Price - Nobody (ft. Karen Harding)', 'file': 'https://alexa-soundcloud.now.sh/stream/308237106/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - All My Life', 'file': 'https://alexa-soundcloud.now.sh/stream/305601075/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'JLV - Alone', 'file': 'https://alexa-soundcloud.now.sh/stream/302371892/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'No Hopes ft. Kinspin - Changes', 'file': 'https://alexa-soundcloud.now.sh/stream/300328918/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Dave Silcox & Kvdos -  Broken Promises (ft. Little Nikki)', 'file': 'https://alexa-soundcloud.now.sh/stream/291513875/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Liv Dawson - Reflection (MI10M Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/289015841/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'},
{'icon': iconImage, 'title': 'Alec Maire - Azuka', 'file': 'https://alexa-soundcloud.now.sh/stream/282427533/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ'}
]})
});

document.getElementById('trSongs').addEventListener('click', function(e) {
    AP.destroy();
e.preventDefault();
  AP.init({
      playList:[
{'icon': iconImage, 'title': '[!] Eric Senn - Magic Box (Original Mix) [TAR#138]', 'file': 'https://alexa-soundcloud.now.sh/stream/404213229/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000307020951-86sq3s-t500x500.jpg'},
{'icon': iconImage, 'title': 'Dreamy - Triggered (Original Mix) @ DJ FeelВґs TOP 25 OF DECEMBER 2014', 'file': 'https://alexa-soundcloud.now.sh/stream/183888662/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000101857737-4bblkq-t500x500.jpg'},
{'icon': iconImage, 'title': 'Stephane Badey - Mars (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/152158778/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000081043240-m71t6a-t500x500.jpg'},
{'icon': iconImage, 'title': 'Lets Fall In Love (Dub Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/109093187/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-5IynclexTtYi-0-t500x500.png'},
{'icon': iconImage, 'title': 'Dark Matter - Shadows Of Depth [FSOE Parallels]', 'file': 'https://alexa-soundcloud.now.sh/stream/567071472/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000480235977-e3znge-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jorn van Deynhoven - Apollo ()', 'file': 'https://alexa-soundcloud.now.sh/stream/95437896/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000140513931-0r8ogw-t500x500.jpg'},
{'icon': iconImage, 'title': 'Electro - Light & Tobu feat. Anna Yvette - Aurora ', 'file': 'https://alexa-soundcloud.now.sh/stream/276334136/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000174313329-x742lv-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren feat. James Newman - Therapy (Sebastian Davidson Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/478759347/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-RHa8zWtpnGH4-0-t500x500.png'},
{'icon': iconImage, 'title': 'Alex Madden - In The Night ', 'file': 'https://alexa-soundcloud.now.sh/stream/269984646/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-1P6gXm8Tgc2u-0-t500x500.png'},
{'icon': iconImage, 'title': 'Will Rees - Persistence [Taken From FSOE Vol. 3] **FSOE 390** !', 'file': 'https://alexa-soundcloud.now.sh/stream/204375729/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000118788982-jdakje-t500x500.jpg'},
{'icon': iconImage, 'title': 'Bluestone - Capetown', 'file': 'https://alexa-soundcloud.now.sh/stream/60538304/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000030671083-jl8ilk-t500x500.jpg'},
{'icon': iconImage, 'title': 'Slam Duck - Life Changes', 'file': 'https://alexa-soundcloud.now.sh/stream/271722400/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000169723898-40mvne-t500x500.jpg'},
{'icon': iconImage, 'title': 'KRONO feat. VanJess - Redlight [Featured on Armada Sunset]', 'file': 'https://alexa-soundcloud.now.sh/stream/137852056/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000072549349-s9q8rq-t500x500.jpg'},
{'icon': iconImage, 'title': 'Nianaro \"Abbey\" (Ben Stone Remix) **', 'file': 'https://alexa-soundcloud.now.sh/stream/217200729/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000124941052-zv1y9g-t500x500.jpg'},
{'icon': iconImage, 'title': 'Into The Woods (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/162966930/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-i2RaI9E4ixwe-0-t500x500.png'},
{'icon': iconImage, 'title': 'Markus Schulz - Waiting (Gai Barone Remix) [from Watch the World Deluxe Edition] [Coming Soon]', 'file': 'https://alexa-soundcloud.now.sh/stream/328231061/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000228554560-fyy448-t500x500.jpg'},
{'icon': iconImage, 'title': 'Never Fade (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/197460834/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-2G0eJ14KYskc-0-t500x500.png'},
{'icon': iconImage, 'title': 'Zachary Zamarripa featuring Mike Schmid - Outrun', 'file': 'https://alexa-soundcloud.now.sh/stream/210736514/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-1bzhG6dvKtRh-0-t500x500.png'},
{'icon': iconImage, 'title': 'Paul Denton - Absolution (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/218755339/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000126028236-ci41vj-t500x500.jpg'},
{'icon': iconImage, 'title': 'D-Unity - Box Shaped Room (Alex Di Stefano Remix) - Preview -', 'file': 'https://alexa-soundcloud.now.sh/stream/12774468/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000005967297-0n7vt6-t500x500.jpg'},
{'icon': iconImage, 'title': 'Suncatcher - Voices Of Jupiter [FSOE Parallels]', 'file': 'https://alexa-soundcloud.now.sh/stream/762599833/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000688138372-nf5ang-t500x500.jpg'},
{'icon': iconImage, 'title': 'Nicholas Antony - Anthem', 'file': 'https://alexa-soundcloud.now.sh/stream/656777690/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000573113927-qeiu7d-t500x500.jpg'},
{'icon': iconImage, 'title': 'Darren Porter & Clara Yates - Believe In Us Again [FSOE]', 'file': 'https://alexa-soundcloud.now.sh/stream/607791342/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000522183537-g8mixu-t500x500.jpg'},
{'icon': iconImage, 'title': 'Aly & Fila vs Ferry Corsten - Camellia (Ciaran McAuley Remix) [FSOE]', 'file': 'https://alexa-soundcloud.now.sh/stream/464022165/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000365665938-wvr47k-t500x500.jpg'},
{'icon': iconImage, 'title': 'Let Go (Feat. Fiora)', 'file': 'https://alexa-soundcloud.now.sh/stream/490054881/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000394041600-of472y-t500x500.jpg'},
{'icon': iconImage, 'title': 'Nikolauss & ARCZI - Narayana (Chris SX Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/212855146/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000121955552-chig6v-t500x500.jpg'},
{'icon': iconImage, 'title': 'Face of Summer (feat. Sarah Decourcy)', 'file': 'https://alexa-soundcloud.now.sh/stream/283998135/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-4el2qa9Tngy2-0-t500x500.jpg'},
{'icon': iconImage, 'title': 'Oliver Smith - Warehouse', 'file': 'https://alexa-soundcloud.now.sh/stream/739637320/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000663709231-jl7apv-t500x500.jpg'},
{'icon': iconImage, 'title': 'Richard Durand & Christina Novelli - The Air I Breathe (Club Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/508890363/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000414415368-4b9vis-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chris Jennings feat. Mary Helen - All Alone (Andy Groove Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/225012591/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000130329544-c7ormx-t500x500.jpg'},
{'icon': iconImage, 'title': 'PsyShark - Electrical Dimension (PsyTrance', 'file': 'https://alexa-soundcloud.now.sh/stream/270811756/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000168951249-vp6lmz-t500x500.jpg'},
{'icon': iconImage, 'title': 'Misja Helsloot vs XiJaro & Pitch - Moving Souls [FSOE]', 'file': 'https://alexa-soundcloud.now.sh/stream/536672784/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000448679487-qhgkw6-t500x500.jpg'},
{'icon': iconImage, 'title': 'twoloud & Kaaze - Maji (Radio Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/278704827/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-6ztA7Nka8DhU-0-t500x500.jpg'},
{'icon': iconImage, 'title': 'Mat Zo - Meaning Lost All Words', 'file': 'https://alexa-soundcloud.now.sh/stream/519698691/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000428124915-hrm7dv-t500x500.jpg'},
{'icon': iconImage, 'title': 'FEEL feat. Johnny Norberg - The Razor (Hydrogenio Radio Edit) [TRANCEMISSION]', 'file': 'https://alexa-soundcloud.now.sh/stream/195050565/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000109462789-j7736p-t500x500.jpg'},
{'icon': iconImage, 'title': 'Sioss - Pyaro [FSOE UV]', 'file': 'https://alexa-soundcloud.now.sh/stream/556319145/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000469268970-bzyluf-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ancient Mind - Dersaadet (Jasper Herbrink Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/107066418/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000056126420-nyhgu3-t500x500.jpg'},
{'icon': iconImage, 'title': 'Tasso - Your Act [FSOE Clandestine]', 'file': 'https://alexa-soundcloud.now.sh/stream/715769755/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000640417933-mzic53-t500x500.jpg'},
{'icon': iconImage, 'title': 'Tuneflux - Frail Devotion (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/245586141/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000145976356-4maw6q-t500x500.jpg'},
{'icon': iconImage, 'title': 'Gabriel & Dresden feat. Jan Burton - You (Myon & Elevven Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/558841242/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000471593955-eit6ka-t500x500.jpg'},
{'icon': iconImage, 'title': 'Breathe (Omar Sherif Remix) [feat. Karen Kelly]', 'file': 'https://alexa-soundcloud.now.sh/stream/306734104/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-2XUalxIzs1Fs-0-t500x500.png'},
{'icon': iconImage, 'title': 'AVACH006 - Somna & Yang Feat. James Darcy - Come Back Tonight (Soty Remix) *Out Now*', 'file': 'https://alexa-soundcloud.now.sh/stream/679950635/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000596569775-pnwk4q-t500x500.jpg'},
{'icon': iconImage, 'title': 'Dan Dobson & Lee Coulson - Nothing Else (Extended Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/316375295/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000216508995-4y61sc-t500x500.jpg'},
{'icon': iconImage, 'title': 'Another World & Nuaro Feat. Sam Vince - Will You Stay The Night (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/211665440/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000121142971-dz9f41-t500x500.jpg'},
{'icon': iconImage, 'title': 'JE', 'file': 'https://alexa-soundcloud.now.sh/stream/224252967/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000129807006-lstb5y-t500x500.jpg'},
{'icon': iconImage, 'title': 'SICK INDIVIDUALS feat. jACQ - Take It On ', 'file': 'https://alexa-soundcloud.now.sh/stream/265464789/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000164051133-qym1qm-t500x500.jpg'},
{'icon': iconImage, 'title': 'AVA215 - Ahmet Atasever - Smashed Avo *Out Now!*', 'file': 'https://alexa-soundcloud.now.sh/stream/422652183/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000327772689-vwgq82-t500x500.jpg'},
{'icon': iconImage, 'title': 'All Night', 'file': 'https://alexa-soundcloud.now.sh/stream/343454324/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000243748463-6kxve2-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jaytech & Judah - Boss Fight', 'file': 'https://alexa-soundcloud.now.sh/stream/326161567/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000226187016-3z7fme-t500x500.jpg'},
{'icon': iconImage, 'title': 'Armin van Buuren - Together [In A State Of Trance] (Alexander Popov Remix) [ASOT693] [!]', 'file': 'https://alexa-soundcloud.now.sh/stream/181014833/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000099902766-dr5oql-t500x500.jpg'},
{'icon': iconImage, 'title': 'Somna & Amy Kirkpatrick - Volcano (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/242868774/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000143858198-08njj4-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ferry Corsten - Beautiful (Aly & Fila Remix)[TEASER] [!]', 'file': 'https://alexa-soundcloud.now.sh/stream/248326291/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000149610890-jox9sr-t500x500.jpg'},
{'icon': iconImage, 'title': 'Above & Beyond - Prelude 2019', 'file': 'https://alexa-soundcloud.now.sh/stream/628872198/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000543862950-pehkwf-t500x500.jpg'},
{'icon': iconImage, 'title': 'Seven Lions & Jason Ross feat. Paul Meany - Higher Love (Grum Remix)', 'file': 'https://alexa-soundcloud.now.sh/stream/335221243/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000235595434-rktzc0-t500x500.jpg'},
{'icon': iconImage, 'title': 'AVA258 - Formal One - Passenger *Out Now!*', 'file': 'https://alexa-soundcloud.now.sh/stream/571923381/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000485192760-cmkb33-t500x500.jpg'},
{'icon': iconImage, 'title': 'Face of Summer (feat. Sarah Decourcy)', 'file': 'https://alexa-soundcloud.now.sh/stream/283998135/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-4el2qa9Tngy2-0-t500x500.jpg'},
{'icon': iconImage, 'title': 'Aly & Fila feat. Sue McLaren - Mysteries Unfold (Radio Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/289303432/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-qRePn9FaAOS2-0-t500x500.png'},
{'icon': iconImage, 'title': 'The Light (Bounce Inc. Radio Edit)', 'file': 'https://alexa-soundcloud.now.sh/stream/255867557/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-RoNEqqoMhTNJ-0-t500x500.png'},
{'icon': iconImage, 'title': 'Andrew Bayer - Voltage Control', 'file': 'https://alexa-soundcloud.now.sh/stream/701494714/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000621816106-075hb5-t500x500.jpg'},
{'icon': iconImage, 'title': 'Andy Elliass & ARCZI - When Im with You (Original Mix)', 'file': 'https://alexa-soundcloud.now.sh/stream/253559230/stream?client_id=iDJ0Aa4u1XF1NNjmMMsbSMv0ugQz4xEQ', 'cover': 'https://i1.sndcdn.com/artworks-000152472670-pz2qx4-t500x500.jpg'},

]})
});

document.getElementById('rrSongs').addEventListener('click', function(e) {
    AP.destroy();
e.preventDefault();
  AP.init({
      playList:[
{'icon': iconImage, 'title': 'Топ 20 Русского Танцпола @ EHR Русские Хиты (03.04.2020) #154', 'file': 'http://promodj.com/download/6981137/%D0%A2%D0%BE%D0%BF%2020%20%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%BE%D0%B3%D0%BE%20%D0%A2%D0%B0%D0%BD%D1%86%D0%BF%D0%BE%D0%BB%D0%B0%20%40%20EHR%20%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B5%20%D0%A5%D0%B8%D1%82%D1%8B%20%2803.04.2020%29%20%23154%20%28promodj.com%29.mp3', 'cover': 'https://is2-ssl.mzstatic.com/image/thumb/Podcasts128/v4/76/ef/1d/76ef1d03-62fa-8d32-0d92-fad4f2d5d40e/mza_2461459753662334279.png/939x0w.png'},
{'icon': iconImage, 'title': 'Земфира - Искала [SpaB MiX]', 'file': 'http://promodj.com/download/6980916/%D0%97%D0%B5%D0%BC%D1%84%D0%B8%D1%80%D0%B0%20-%20%D0%98%D1%81%D0%BA%D0%B0%D0%BB%D0%B0%20%5BSpaB%20MiX%5D%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Neteta - Feel It (EDscore Remix)', 'file': 'http://promodj.com/download/6936546/Neteta%20-%20Feel%20It%20%28EDscore%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Анна Филипчук Любовь-война (M-DimA Remix 2)', 'file': 'http://promodj.com/download/6964639/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28M-DimA%20Remix%202%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'NILETTO - Любимка (Dj Killjoy Remix)', 'file': 'http://promodj.com/download/6941648/NILETTO%20-%20%D0%9B%D1%8E%D0%B1%D0%B8%D0%BC%D0%BA%D0%B0%20%28Dj%20Killjoy%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Massive Attack – Teardrop (IVAN ADVAN Remix)', 'file': 'http://promodj.com/download/6980089/Massive%20Attack%20%E2%80%93%20Teardrop%20%28IVAN%20ADVAN%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'SUMMER', 'file': 'http://promodj.com/download/6979401/SUMMER%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'DJ Antoine & The Beat Shakers Ft. Trauffer - Ma Cherie (DJ Ad!k 2020 Booty Mix)', 'file': 'http://promodj.com/download/6979383/DJ%20Antoine%20%26%20The%20Beat%20Shakers%20Ft.%20Trauffer%20-%20Ma%20Cherie%20%28DJ%20Ad%21k%202020%20Booty%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Barinova - Самый-самый (DJPS Remix)', 'file': 'http://promodj.com/download/6976381/Barinova%20-%20%D0%A1%D0%B0%D0%BC%D1%8B%D0%B9-%D1%81%D0%B0%D0%BC%D1%8B%D0%B9%20%28DJPS%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Анна Филипчук – Любовь-война (Sergiy Akinshin Remix)', 'file': 'http://promodj.com/download/6959907/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20%E2%80%93%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28Sergiy%20Akinshin%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'JeLLyFiSh', 'file': 'http://promodj.com/download/6978703/JeLLyFiSh%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Earlwood ( CJ Matveev RMX ) - Paradise 2020 !', 'file': 'http://promodj.com/download/6934502/Earlwood%20%28%20CJ%20Matveev%20RMX%20%29%20-%20Paradise%202020%20%21%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Ace Of Base – Beautiful Life (Aleksey Podgornov Dance remix 2020)', 'file': 'http://promodj.com/download/6941965/Ace%20Of%20Base%20%E2%80%93%20Beautiful%20Life%20%28Aleksey%20Podgornov%20Dance%20remix%202020%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'ДЛБ - Чёрные Кальяны (Glazur & XM Remix)', 'file': 'http://promodj.com/download/6979217/%D0%94%D0%9B%D0%91%20-%20%D0%A7%D1%91%D1%80%D0%BD%D1%8B%D0%B5%20%D0%9A%D0%B0%D0%BB%D1%8C%D1%8F%D0%BD%D1%8B%20%28Glazur%20%26%20XM%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Гранды - С днем рождения, братуха (MaxUng Mash)', 'file': 'http://promodj.com/download/6979749/%D0%93%D1%80%D0%B0%D0%BD%D0%B4%D1%8B%20-%20%D0%A1%20%D0%B4%D0%BD%D0%B5%D0%BC%20%D1%80%D0%BE%D0%B6%D0%B4%D0%B5%D0%BD%D0%B8%D1%8F%2C%20%D0%B1%D1%80%D0%B0%D1%82%D1%83%D1%85%D0%B0%20%28MaxUng%20Mash%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Chok — I have to say (DJ CRAZY PUMP REMIX)', 'file': 'http://promodj.com/download/6966636/Chok%20%E2%80%94%20I%20have%20to%20say%20%28DJ%20CRAZY%20PUMP%20REMIX%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'GunOut - Freaking', 'file': 'http://promodj.com/download/6980011/GunOut%20-%20Freaking%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Chok — I Have To Say (DJPS Remix)', 'file': 'http://promodj.com/download/6955887/Chok%20%E2%80%94%20I%20Have%20To%20Say%20%28DJPS%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Miyagi - Marlboro (Assata Remix)', 'file': 'http://promodj.com/download/6980523/Miyagi%20-%20Marlboro%20%28Assata%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Руки Вверх - Ай-яй-яй (Ze Mod Remix)', 'file': 'http://promodj.com/download/6979745/%D0%A0%D1%83%D0%BA%D0%B8%20%D0%92%D0%B2%D0%B5%D1%80%D1%85%20-%20%D0%90%D0%B9-%D1%8F%D0%B9-%D1%8F%D0%B9%20%28Ze%20Mod%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Chok - I Have To Say #2 old (ELECTRO BAMM Remix)', 'file': 'http://promodj.com/download/6974512/Chok%20-%20I%20Have%20To%20Say%20%232%20old%20%28ELECTRO%20BAMM%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Ramdeejay Coronaboom', 'file': 'http://promodj.com/download/6979703/Ramdeejay%20Coronaboom%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'DJ Snake, Eptic, Ship Wrek, Benny Benassi - SouthSide Satisfaction (Deejay Deeper Bootleg)', 'file': 'http://promodj.com/download/6979924/DJ%20Snake%2C%20Eptic%2C%20Ship%20Wrek%2C%20Benny%20Benassi%20-%20SouthSide%20Satisfaction%20%28Deejay%20Deeper%20Bootleg%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Русский Размер - Ю-А-Ю (IvanDragoRmx)', 'file': 'http://promodj.com/download/6935117/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9%20%D0%A0%D0%B0%D0%B7%D0%BC%D0%B5%D1%80%20-%20%D0%AE-%D0%90-%D0%AE%20%28IvanDragoRmx%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Barinova - Самый-самый (Dj DoGLife remix)3', 'file': 'http://promodj.com/download/6981086/Barinova%20-%20%D0%A1%D0%B0%D0%BC%D1%8B%D0%B9-%D1%81%D0%B0%D0%BC%D1%8B%D0%B9%20%28Dj%20DoGLife%20remix%293%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Вуаль - Всё не просто', 'file': 'http://promodj.com/download/6980651/%D0%92%D1%83%D0%B0%D0%BB%D1%8C%20-%20%D0%92%D1%81%D1%91%20%D0%BD%D0%B5%20%D0%BF%D1%80%D0%BE%D1%81%D1%82%D0%BE%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Андрей Леницкий, Nebezao x Modernator - Целуешь, Прощаешь (Artem Spy Edit)', 'file': 'http://promodj.com/download/6980488/%D0%90%D0%BD%D0%B4%D1%80%D0%B5%D0%B9%20%D0%9B%D0%B5%D0%BD%D0%B8%D1%86%D0%BA%D0%B8%D0%B9%2C%20Nebezao%20x%20Modernator%20-%20%D0%A6%D0%B5%D0%BB%D1%83%D0%B5%D1%88%D1%8C%2C%20%D0%9F%D1%80%D0%BE%D1%89%D0%B0%D0%B5%D1%88%D1%8C%20%28Artem%20Spy%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Roman Petrov - The barber of your heart (FunkySerg Remix)', 'file': 'http://promodj.com/download/6980985/Roman%20Petrov%20-%20The%20barber%20of%20your%20heart%20%28FunkySerg%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Анна Филипчук - Любовь-война (Like Post Remix)', 'file': 'http://promodj.com/download/6959332/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20-%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28Like%20Post%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'A.Yelizaroff-DRIVE(dont give up)', 'file': 'http://promodj.com/download/6980197/A.Yelizaroff-DRIVE%28don%27t%20give%20up%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'GAYAZOV$ BROTHER$ - КРЕДО (Alex Shik Radio Edit)', 'file': 'http://promodj.com/download/6980634/GAYAZOV%24%20BROTHER%24%20-%20%D0%9A%D0%A0%D0%95%D0%94%D0%9E%20%28Alex%20Shik%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'КАРАНТИННАЯ (Всё по-другому)', 'file': 'http://promodj.com/download/6978594/%D0%9A%D0%90%D0%A0%D0%90%D0%9D%D0%A2%D0%98%D0%9D%D0%9D%D0%90%D0%AF%20%28%D0%92%D1%81%D1%91%20%D0%BF%D0%BE-%D0%B4%D1%80%D1%83%D0%B3%D0%BE%D0%BC%D1%83%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Ivan ART feat. Sen J, Amsel, Александра Рудецкая - Разошлись пути [Retro Version]', 'file': 'http://promodj.com/download/6977994/Ivan%20ART%20feat.%20Sen%20J%2C%20Amsel%2C%20%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B0%D0%BD%D0%B4%D1%80%D0%B0%20%D0%A0%D1%83%D0%B4%D0%B5%D1%86%D0%BA%D0%B0%D1%8F%20-%20%D0%A0%D0%B0%D0%B7%D0%BE%D1%88%D0%BB%D0%B8%D1%81%D1%8C%20%D0%BF%D1%83%D1%82%D0%B8%20%5BRetro%20Version%5D%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'The Weeknd - Blinding Lights (Savin remix)', 'file': 'http://promodj.com/download/6980015/The%20Weeknd%20-%20Blinding%20Lights%20%28Savin%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'HammAli & Navai - Где ты была  (Stylezz REMIX)', 'file': 'http://promodj.com/download/6949142/HammAli%20%26%20Navai%20-%20%D0%93%D0%B4%D0%B5%20%D1%82%D1%8B%20%D0%B1%D1%8B%D0%BB%D0%B0%20%20%28Stylezz%20REMIX%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'GAYAZOV$ BROTHER$ -  ХЕДШОТ (Dj Sasha White Radio Edit)', 'file': 'http://promodj.com/download/6979473/GAYAZOV%24%20BROTHER%24%20-%20%20%D0%A5%D0%95%D0%94%D0%A8%D0%9E%D0%A2%20%28Dj%20Sasha%20White%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Scooter - The Logical Song (Alex Mistery Remix)', 'file': 'http://promodj.com/download/6966738/Scooter%20-%20The%20Logical%20Song%20%28Alex%20Mistery%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Jasper Forks-River flows (DJ KOLIN Remix)', 'file': 'http://promodj.com/download/6980346/Jasper%20Forks-River%20flows%20%28DJ%20KOLIN%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Не верю тебе, Ариадна', 'file': 'http://promodj.com/download/6980066/%D0%9D%D0%B5%20%D0%B2%D0%B5%D1%80%D1%8E%20%D1%82%D0%B5%D0%B1%D0%B5%2C%20%D0%90%D1%80%D0%B8%D0%B0%D0%B4%D0%BD%D0%B0%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'FILV - Clandestina (BONDAR DJ REMIX 2020)', 'file': 'http://promodj.com/download/6979272/FILV%20-%20Clandestina%20%28BONDAR%20DJ%20REMIX%202020%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'MiXi feat. 23:45 - Текила (X Brain Remix)', 'file': 'http://promodj.com/download/6946137/MiXi%20feat.%2023%3A45%20-%20%D0%A2%D0%B5%D0%BA%D0%B8%D0%BB%D0%B0%20%28X%20Brain%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Тайпан, Agunda - Луна не знает пути (Serg Shenon & Yudzhin Radio Remix)', 'file': 'http://promodj.com/download/6980544/%D0%A2%D0%B0%D0%B9%D0%BF%D0%B0%D0%BD%2C%20Agunda%20-%20%D0%9B%D1%83%D0%BD%D0%B0%20%D0%BD%D0%B5%20%D0%B7%D0%BD%D0%B0%D0%B5%D1%82%20%D0%BF%D1%83%D1%82%D0%B8%20%28Serg%20Shenon%20%26%20Yudzhin%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Зомб x Andreew - Она Горит на танцполе (Dj SneiF Mash Up )', 'file': 'http://promodj.com/download/6978704/%D0%97%D0%BE%D0%BC%D0%B1%20x%20Andreew%20-%20%D0%9E%D0%BD%D0%B0%20%D0%93%D0%BE%D1%80%D0%B8%D1%82%20%D0%BD%D0%B0%20%D1%82%D0%B0%D0%BD%D1%86%D0%BF%D0%BE%D0%BB%D0%B5%20%28Dj%20SneiF%20Mash%20Up%20%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'chichigaga - love me', 'file': 'http://promodj.com/download/6979228/chichigaga%20-%20love%20me%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'HammAli & Navai - Где ты была  (Stylezz REMIX)', 'file': 'http://promodj.com/download/6949142/HammAli%20%26%20Navai%20-%20%D0%93%D0%B4%D0%B5%20%D1%82%D1%8B%20%D0%B1%D1%8B%D0%BB%D0%B0%20%20%28Stylezz%20REMIX%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Gidayyat, Gazan - КОРОНАМИНУС (DJ Ramirez Remix)', 'file': 'http://promodj.com/download/6963792/Gidayyat%2C%20Gazan%20-%20%D0%9A%D0%9E%D0%A0%D0%9E%D0%9D%D0%90%D0%9C%D0%98%D0%9D%D0%A3%D0%A1%20%28DJ%20Ramirez%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Kaoma - Lambada (Scorpio & Scrooge Reboot)', 'file': 'http://promodj.com/download/6979434/Kaoma%20-%20Lambada%20%28Scorpio%20%26%20Scrooge%20Reboot%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Слава Васильев - Так вот какая ты', 'file': 'http://promodj.com/download/6978332/%D0%A1%D0%BB%D0%B0%D0%B2%D0%B0%20%D0%92%D0%B0%D1%81%D0%B8%D0%BB%D1%8C%D0%B5%D0%B2%20-%20%D0%A2%D0%B0%D0%BA%20%D0%B2%D0%BE%D1%82%20%D0%BA%D0%B0%D0%BA%D0%B0%D1%8F%20%D1%82%D1%8B%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'NECHAEV - Слезы (Eddie G Radio Remix)', 'file': 'http://promodj.com/download/6980087/NECHAEV%20-%20%D0%A1%D0%BB%D0%B5%D0%B7%D1%8B%20%28Eddie%20G%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Chok - I  Have To Say (Maraqua Remix 2)', 'file': 'http://promodj.com/download/6979326/Chok%20-%20I%20%20Have%20To%20Say%20%28Maraqua%20Remix%202%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Макс Корж - Амстердам (Iblis remix radio edit)', 'file': 'http://promodj.com/download/6979004/%D0%9C%D0%B0%D0%BA%D1%81%20%D0%9A%D0%BE%D1%80%D0%B6%20-%20%D0%90%D0%BC%D1%81%D1%82%D0%B5%D1%80%D0%B4%D0%B0%D0%BC%20%28Iblis%20remix%20radio%20edit%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Dima Isay - Love (Original Mix)', 'file': 'http://promodj.com/download/6979439/Dima%20Isay%20-%20Love%20%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'JONY - Комета (Glazur & Olmega Remix)', 'file': 'http://promodj.com/download/6979211/JONY%20-%20%D0%9A%D0%BE%D0%BC%D0%B5%D1%82%D0%B0%20%28Glazur%20%26%20Olmega%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'NK - Elefante (Black Toriouz Radio Edit)', 'file': 'http://promodj.com/download/6980881/NK%20-%20Elefante%20%28Black%20Toriouz%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Муть', 'file': 'http://promodj.com/download/6980191/%D0%9C%D1%83%D1%82%D1%8C%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Navai - Эгоист (Alwa Game remix)', 'file': 'http://promodj.com/download/6978515/Navai%20-%20%D0%AD%D0%B3%D0%BE%D0%B8%D1%81%D1%82%20%28Alwa%20Game%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'},
{'icon': iconImage, 'title': 'Ludacris - Act A Fool ( DJ Mail Mash-Up )[2020]', 'file': 'http://promodj.com/download/6980113/Ludacris%20-%20Act%20A%20Fool%20%28%20DJ%20Mail%20Mash-Up%20%29%5B2020%5D%20%28promodj.com%29.mp3', 'cover': 'https://themfire.com/wp-content/uploads/2015/03/Deep-House.jpg'}
          ]})
});

document.getElementById('rsSongs').addEventListener('click', function(e) {
    AP.destroy();
e.preventDefault();
  AP.init({
      playList:[
         {'icon': iconImage, 'title': '‎Transmission Radio', 'file': 'http://audio.thisisdistorted.com/repository/audio/episodes/Transmission_Radio_267_iTunes-1585646859474183987-MzAxMjgtODYzODYwMjA=.mp3', 'cover': 'https://is5-ssl.mzstatic.com/image/thumb/Podcasts113/v4/4a/08/f0/4a08f03c-6f68-7d6b-4cf8-921ddb1ec92c/mza_16117164316925034706.png/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Paul Thomas presents UV Radio', 'file': 'http://feeds.soundcloud.com/stream/788680882-djpaulthomas-paul-thomas-presents-uv-radio-130.mp3', 'cover': 'https://is4-ssl.mzstatic.com/image/thumb/Podcasts113/v4/41/94/84/419484e2-d567-e6f5-8eed-e5c1064f767b/mza_1669091840704367489.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Jaytech Music Podcast', 'file': 'https://mcdn.podbean.com/mf/web/b3r3q3/Jaytech_Music_Podcast_147_-_Unreleased_Tunes_Special_2.mp3', 'cover': 'https://is5-ssl.mzstatic.com/image/thumb/Podcasts123/v4/24/ce/87/24ce8791-b9d7-c33e-5e32-15077f0b87fe/mza_5047330853122380582.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Paul van Dyk's VONYC Sessions Podcast', 'file': 'http://audio.thisisdistorted.com/repository/audio/episodes/V700_2_Hour_Show-1585857146603687169-MzAxNTEtMTE5MzU5OTI5.m4a', 'cover': 'https://is5-ssl.mzstatic.com/image/thumb/Podcasts123/v4/13/ba/6a/13ba6a5c-5032-6f1d-545f-2c3aa49a57ea/mza_16237941372195075687.png/552x0w.jpg'},
{'icon': iconImage, 'title': '‎EDX's No Xcuses Podcast', 'file': 'http://traffic.libsyn.com/edxnoxcuses/ENOX476_iTundgjigsgf.mp3?dest-id=64289', 'cover': 'https://is3-ssl.mzstatic.com/image/thumb/Podcasts123/v4/d3/72/f9/d372f9cf-c65c-4394-8c01-e491847e6fe8/mza_13373421473835957718.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Above &amp; Beyond: Group Therapy', 'file': 'http://traffic.libsyn.com/anjunabeats/group-therapy-375-with-above-beyond-and-dylhen.m4a', 'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/49/b8/3b/49b83bc2-8d26-829a-38ef-a9fe992f59dc/mza_3713017386252311615.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Anjunabeats Worldwide', 'file': 'http://traffic.libsyn.com/anjunadeep/Anjunabeats_Worldwide_671_with_Cosmic_Gate.mp3', 'cover': 'https://is3-ssl.mzstatic.com/image/thumb/Podcasts123/v4/c2/b1/84/c2b1843e-026d-f1b2-82bc-195ddc48cc2b/mza_4048134186113672980.png/552x0w.jpg'},
{'icon': iconImage, 'title': '‎Steve Allen Pres Uplift', 'file': 'https://mcdn.podbean.com/mf/web/wzy8ua/Steve_Allen_Pres_Uplift_082.mp3', 'cover': 'https://is2-ssl.mzstatic.com/image/thumb/Podcasts113/v4/51/5c/4c/515c4cd3-3302-2a65-9cff-a678ab6670e4/mza_2024987804034631867.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎The firecastradioshow's Podcast', 'file': 'https://mcdn.podbean.com/mf/web/p8drpj/Alex_Di_Stefano_-_FireCast_Radio_049_-_LIVE.mp3', 'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/77/60/64/7760643f-cdc0-0c5a-c3a5-a8116c8838dc/mza_5260858702148483766.jpg/552x0w.jpg'},
{'icon': iconImage, 'title': '‎The Menno de Jong Cloudcast', 'file': 'http://www.mennodejong.com/cloudcast/Menno%20de%20Jong%20Cloudcast%20089%20-%20January%202020%20-%20Yearmix%20\u0026%20Finale.mp3', 'cover': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/91/ca/4c/91ca4cf5-3024-9f11-89fd-991bef291c3f/mza_672176834817290940.png/552x0w.jpg'},

          ]})
});
