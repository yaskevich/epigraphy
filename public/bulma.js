// The following code is based off a toggle menu by @Bradcomp
// source: https://gist.github.com/Bradcomp/a9ef2ef322a8e8017443b626208999c1
(function() {
	
	bulmaCollapsible.attach();
	
    var burger = document.querySelector('.burger');
    var menu = document.querySelector('#'+burger.dataset.target);
    burger.addEventListener('click', function() {
        burger.classList.toggle('is-active');
        menu.classList.toggle('is-active');
    });
	
	
	
	$("#transcription>.tabs>ul>li" ).click(function() {
		$('.trans-pract').toggleClass('is-active');
		$('.trans-orig').toggleClass('is-active');
		
		$('.readable').toggleClass('is-hidden');
		$('.transcript').toggleClass('is-hidden');
	});
	
	
	  // console.log(data[0]);
	  
	  
	$('.naming').html(datum ["name"]);	  
	// $('.transcript').html(datum ["transcript"]);	  
	  
	// var times = 25;
	// var arr = [];
	// for(var i=0; i < times; i++){
		// var a = Math.random().toString(36).substring(2, 15) 
		// arr.push(a);
	// }

	
	function replacer(match, p1, p2, p3) {
		  // return [p1, p2, p3].join(' - ');
		  if (p2 === "cyr" || p2 === "pub" ){
			  console.log(p1, p2);
			  var tag = p1 === "<" ? 'span class="'+p2+'"': "span";
			  return p1 + tag;
		  } else {
			return match;  
		  }
		  
	}
	
	
	function retag(text){
		return text.replace(/([\<\/]+)(\w+)(?=[>])/g, replacer);
	}
	  
	  
	  // $('.transcript').html(arr.join(' '));	  
	  $('.transcript').html(retag(datum["script"]));	  
	  $('.readable').html(datum["transcript"].replace(/\(/g, '<span class="fix" title="дополненные буквы">').replace(/\)/g, '</span>'));	  
	  
	  console.log(datum.ogs);
	  $('.photo').attr("src", "XY_10pcnt/"+ datum["ogs"][0]+"X.jpg");
	  $('.story').html(datum["history"]);	  
	  $('.place').html(datum["place"]);	  
	  
	
	var fields = ["com_paleo", "com_phil", "com_text", "com_hist", "pubs"];
	fields.forEach(function callback(val, index, array) {
		if (datum[val]){
			var content = retag(datum[val]);
			if (content) {
				console.log('#'+val);
				$('.'+val).html(content);
				
				$('.'+val).parent().removeClass('is-hidden');
			} 
		} else {
				$('#'+val).parent().addClass('is-hidden');
		}
	});
	  

})();
