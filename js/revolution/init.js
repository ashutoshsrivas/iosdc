var tpj=jQuery;
var revapi24;
tpj(document).ready(function() {

	if(tpj("#rev_slider").revolution == undefined){
		revslider_showDoubleJqueryError("#rev_slider");
	}else{
		var prevPos = 120;
		var nextPos = 230;
		if ($(window).width() <= 992){
			prevPos = 10;
			nextPos = 120;
		}


		revapi24 = tpj("#rev_slider").show().revolution(
		{
      sliderType:"standard",
      sliderLayout: "auto",//"fullscreen",
			fullScreenAlignForce: 'off',
      dottedOverlay:"none",
      delay:7000,
      minHeight:380,
      navigation: {
        keyboardNavigation:"off",
        keyboard_direction: "horizontal",
        onHoverStop:"off",
        touch:{
          touchenabled:"on",
          swipe_threshold: 75,
          swipe_min_touches: 1,
          swipe_direction: "horizontal",
          drag_block_vertical: false
        },
				arrows: {
					enable:true,
					tmp:'',
					hide_onmobile: true,
					left: {
						container: 'layergrid',
						h_align:"left",
						v_align:"bottom",
						h_offset:prevPos,
						v_offset:0
					},
					right: {
						container: 'layergrid',
						h_align:"left",
						v_align:"bottom",
						h_offset:nextPos,
						v_offset:0
					}
				},
				tabs: {
					enable: true,
					style: '',
					h_align: 'right',
        	v_align: 'bottom',
        	h_offset: 0,
        	v_offset: 0,
					width: 360,
					height: 170,
					//min_width: 180,
					tmp: '<button class="slide-tab" type="button"><span class="slide-tab__number">{{param1}}</span><span class="slide-tab__title">{{title}}</span></button>',
				},
      },
      parallax: {
        type:"scroll",
        origo:"slidercenter",
        speed:300,
        levels:[5,10,15,20,25,30,35,40,45,50,47,48,49,50,51,55],
        disable_onmobile: 'on'
      },
      responsiveLevels:[1200,992,768,576],
      gridwidth:[1140,960,740,540],
      gridheight:[800,700,600,500],
      lazyType:"none",
      shadow:0,
      spinner:"off",
      stopLoop:"on",
      stopAfterLoops:0,
      shuffle:"off",
      fullScreenOffsetContainer: "#header",
      fullScreenOffset: "",
      disableProgressBar:"on",
      hideThumbsOnMobile:"off",
      hideSliderAtLimit:0,
      hideCaptionAtLimit:0,
      hideAllCaptionAtLilmit:0,
      debugMode:false,
      fallbacks: {
        simplifyAll:"off",
        nextSlideOnWindowFocus:"off",
        disableFocusListener:false,
      }
    });
	}

});
