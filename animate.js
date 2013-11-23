// JavaScript Document

$(document).ready(function() {

	// 2dコンテキスト取得
	var canvas = $("#model_viewer");
	var context = canvas.get(0).getContext("2d");
	canvas.get(0).width = canvas.get(0).clientWidth;
	canvas.get(0).height = canvas.get(0).clientHeight;
	var canvasWidth = canvas.get(0).width;
	var canvasHeight = canvas.get(0).height;
	
	// 座標系の変換
	var xzero = canvasWidth * 0.5;
	var yzero = canvasHeight * 0.9;
	context.transform(1, 0, 0, -1, xzero, yzero);
	
	// マウス位置取得用変数	
	var mousePos = [0,0];	
	var mouseState = "Up";
	// mouse移動時のイベントコールバック設定
	$(window).mousedown( function(e){
		var canvasOffset = canvas.offset();
		var canvasX = Math.floor(e.pageX-canvasOffset.left);
		var canvasY = Math.floor(e.pageY-canvasOffset.top);
		if(canvasX>canvasWidth)return;
		if(canvasY>canvasHeight)return;
		mouseState = "Down";		
		mousePos = [canvasX-xzero, -canvasY+yzero];
	});	
	$(window).mousemove( function(e){
		var canvasOffset = canvas.offset();
		var canvasX = Math.floor(e.pageX-canvasOffset.left);
		var canvasY = Math.floor(e.pageY-canvasOffset.top);
		mousePos = [canvasX-xzero, -canvasY+yzero];
	});	
	$(window).mouseup( function(e){
		mouseState = "Up";
		var canvasOffset = canvas.offset();
		var canvasX = Math.floor(e.pageX-canvasOffset.left);
		var canvasY = Math.floor(e.pageY-canvasOffset.top);
		mousePos = [canvasX-xzero, -canvasY+yzero];
	});	
		
	
	// FEMインスタンス作成
	var fem = new FEM(1000, 0.4, 200, 200, 8, 8);	
	
	var time = 0;
	animate();
	
	// アニメーションループ
	function animate(){
		var disp;
		if(mouseState == "Down")
			disp = numeric.sub(mousePos,[0,200]);
		else
			disp = [0,0];
		fem.setBoudary(0,200,disp);	
		fem.calcDeformation();
		fem.calcStress();
		drawScene();
		time += 0.03;
		setTimeout(animate, 30);
	}
	
	///////////////////////////////////////////////
	// 以下は描画に関する関数
	///////////////////////////////////////////////
	
	// シーンの描画
	function drawScene(){
		// チェックボックスの値取得
		var contourFlag = $('#conCheckBox').is(':checked');
		var tensorFlag = $('#tensCheckBox').is(':checked');
		var tensorLFlag = $('#tensLCheckBox').is(':checked');
		
		// canvasのクリア
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvasWidth, canvasHeight);
		// 図形の描画
		context.setTransform(1, 0, 0, -1, xzero, yzero);
		// メッシュ
		
	
		var p1,p2,p3;
		if(contourFlag){
			for(var i=0; i<fem.Tri.length; i++){
				setTriColorRGB(fem.maxPStress[i], 1000, -1000);
				p1 = fem.Pos[fem.Tri[i][0]];
				p2 = fem.Pos[fem.Tri[i][1]];
				p3 = fem.Pos[fem.Tri[i][2]];
				drawTri(p1,p2,p3);
			}
			// カラーバー
			drawColorBar(-canvasWidth*0.5+10, 10, 1000, -1000);
		}else{
			context.strokeStyle = 'rgb(0,0,0)';
			context.fillStyle = 'rgb(200,200,200)';
			for(var i=0; i<fem.Tri.length; i++){
				p1 = fem.Pos[fem.Tri[i][0]];
				p2 = fem.Pos[fem.Tri[i][1]];
				p3 = fem.Pos[fem.Tri[i][2]];
				drawTri(p1,p2,p3);
			}
		}

				
		// 応力場の描画
		if(tensorFlag)
			drawStressField(0.01);
		else if(tensorLFlag){
			drawStressFieldFix(10);	
		}
	}
	
	// 線の描画
	function drawLine(p1, p2){
		context.beginPath();
		context.moveTo( p1[0], p1[1]);
		context.lineTo( p2[0], p2[1]);
		context.stroke();
	}
	
	// 円の描画
	function drawCircle(p, radius){
		context.beginPath();
		context.arc( p[0], p[1], radius, 0, 2*Math.PI, true);
		context.stroke();
		context.fill();
	}	
		
	// 三角形の描画
	function drawTri(p1, p2, p3){
		context.beginPath();
		context.moveTo( p1[0], p1[1]);
		context.lineTo( p2[0], p2[1]);
		context.lineTo( p3[0], p3[1]);
		context.closePath();
		context.stroke();
		context.fill();
	}
	
	// 三角形の色を決める
	function setTriColorRGB(val, max, min){
		if(val>max) val=max;
		if(val<min) val=min;
		var x = 1.0/(max-min)*(val-min);
		var r1,g1,b1;
		if(val<0.5){
			r1 = 0;
			g1 = 2*x;
			b1 = -2*x+1;
		}else{
			r1 = 2*x-1;
			g1 = -2*x+2;
			b1 = 0;
		}
		var r255 = (r1*200).toFixed(0);
		var g255 = (g1*200).toFixed(0);
		var b255 = (b1*200).toFixed(0);
		var str = "rgb(" + r255 + "," + g255 + "," + b255 + ")";
		context.fillStyle = str;
	}
	// 三角形の色を決める
	function setTriColorK(val, max, min){
		if(val>max) val=max;
		if(val<min) val=min;
		var zero = 255/(max-min)*min
		var c = (255/(max-min)*(val-min)).toFixed(0);
		var str = "rgb(" + c + "," + c + "," + c + ")";
		context.fillStyle = str;
	}
	
	// 応力場
	function drawStressField(scale){
		var p, sxv, syv, th, rot, v, vp, vn;
		for(var i=0; i<fem.Tri.length; i++){
			// 三角形の中心ベクトル計算
			p = [0,0];
			p = numeric.add(p,fem.Pos[fem.Tri[i][0]]);
			p = numeric.add(p,fem.Pos[fem.Tri[i][1]]);
			p = numeric.add(p,fem.Pos[fem.Tri[i][2]]);
			p = numeric.div(p,3);
			
			// 回転行列計算
			th = fem.alpha[i];
			rot = [[Math.cos(th),-Math.sin(th)],[Math.sin(th),Math.cos(th)]];

			// sigma1の描画			
			sxv = [fem.PStress[i][0],0];
			v = numeric.dot(rot,sxv);
			v = numeric.mul(scale,v);
			vp = numeric.add(p,v);
			vn = numeric.sub(p,v);
			if(fem.PStress[i][0] < 0)
				context.strokeStyle = 'rgb(0,0,255)';
			else
				context.strokeStyle = 'rgb(255,0,0)';
			drawLine(vn,vp);
			
			// sigma2の描画			
			syv = [0,fem.PStress[i][1]];
			v = numeric.dot(rot,syv);
			v = numeric.mul(scale,v);
			vp = numeric.add(p,v);
			vn = numeric.sub(p,v);
			if(fem.PStress[i][1] < 0)
				context.strokeStyle = 'rgb(0,0,255)';
			else
				context.strokeStyle = 'rgb(255,0,0)';
			drawLine(vn,vp);
		}
	}
	
	// 応力場（固定長）
	function drawStressFieldFix(len){
		var p, sxv, syv, th, rot, v, vp, vn;
		var cutoff = 50;
		for(var i=0; i<fem.Tri.length; i++){
			// 三角形の中心ベクトル計算
			p = [0,0];
			p = numeric.add(p,fem.Pos[fem.Tri[i][0]]);
			p = numeric.add(p,fem.Pos[fem.Tri[i][1]]);
			p = numeric.add(p,fem.Pos[fem.Tri[i][2]]);
			p = numeric.div(p,3);
			
			// 回転行列計算
			th = fem.alpha[i];
			rot = [[Math.cos(th),-Math.sin(th)],[Math.sin(th),Math.cos(th)]];

			// sigma1の描画			
			if(Math.abs(fem.PStress[i][0])>cutoff){
				sxv = [len,0];
				v = numeric.dot(rot,sxv);
				vp = numeric.add(p,v);
				vn = numeric.sub(p,v);
				if(fem.PStress[i][0] < 0)
					context.strokeStyle = 'rgb(0,0,255)';
				else
					context.strokeStyle = 'rgb(255,0,0)';
				drawLine(vn,vp);
			}
			
			// sigma2の描画			
			if(Math.abs(fem.PStress[i][1])>cutoff){
				syv = [0,len];
				v = numeric.dot(rot,syv);
				vp = numeric.add(p,v);
				vn = numeric.sub(p,v);
				if(fem.PStress[i][1] < 0)
					context.strokeStyle = 'rgb(0,0,255)';
				else
					context.strokeStyle = 'rgb(255,0,0)';
				drawLine(vn,vp);
			}
		}
	}	
	
	// カラーバー
	function drawColorBar(x0,y0,max,min){
		context.setTransform(1, 0, 0, -1, xzero, yzero);
		var cWidth = 20;
		var cHeight = 150;
		var ydiv = 20;
		for(var i=0; i<ydiv; i++){
			setTriColorRGB((max-min)/ydiv*i+min, max, min);
			context.fillRect(x0, y0+cHeight/ydiv*i, cWidth, cHeight/ydiv);
		}
		context.strokeStyle = 'rgb(0,0,0)';
		context.strokeRect(x0, y0, cWidth, cHeight);
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.font = "14px 'Arial'";
		context.textAlign = "left";
		context.strokeStyle = 'rgb(0,0,0)';
		context.fillStyle = 'rgb(0,0,0)';
		context.fillText(min, x0+cWidth+xzero, -y0+yzero);	
		context.fillText((max+min)*0.5, x0+cWidth+xzero, -(y0+cHeight*0.5)+yzero);	
		context.fillText(max, x0+cWidth+xzero, -(y0+cHeight)+yzero);			
		context.setTransform(1, 0, 0, -1, xzero, yzero);
	}
	
});


