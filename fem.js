// JavaScript Document

function FEM(young,poisson,width,height,divx,divy){
	this.Pos = [];
	this.InitPos = [];
	this.Tri = [];
	this.Be = [];
	this.De = [];
	this.K = [];
	this.flist = [];
	this.dlist = [];
	this.u = [];
	this.f = [];
	this.ud = [];
	this.ff = [];
	this.Sigma = [];
	this.alpha = [];
	this.PStress = [];
	this.maxPStress = [];
	this.init(young,poisson,width,height,divx,divy);
}

// 初期化メソッド
FEM.prototype.init = function(young,poisson,width,height,divx,divy){
	this.rectangleMesh(width,height,divx,divy);
	this.makeMatrixK(young, poisson, 1);
	this.Sigma = new Array(this.Tri.length);
	for(var i=0; i<this.Sigma.length; i++)
		this.Sigma[i] = [0,0,0];
	this.alpha = numeric.linspace(0,0,this.Tri.length);
	this.PStress = new Array(this.Tri.length);
	for(var i=0; i<this.PStress.length; i++)
		this.PStress[i] = [0,0];
	this.maxPStress = numeric.linspace(0,0,this.Tri.length);
}

// 四角形メッシュのノード位置配列
FEM.prototype.rectangleMesh = function(width, height, divx, divy){
	for(var i=0; i<divy+1; i++){
		for(var j=0; j<divx+1; j++){
			this.Pos.push([width/divx*j-width*0.5, height/divy*i]);
			this.InitPos.push([width/divx*j-width*0.5, height/divy*i]);
		}
	}
	for(var i=0; i<divy; i++){
		for(var j=0; j<divx; j++){
			this.Tri.push([j+(divx+1)*i, j+1+(divx+1)*i, j+(divx+1)*(i+1)]);
			this.Tri.push([j+1+(divx+1)*i, j+1+(divx+1)*(i+1), j+(divx+1)*(i+1)]);
		}
	}	
}


FEM.prototype.makeMatrixK = function(young, poisson, thickness){
		
	// Dマトリクスを作成
	this.D = this.makeMatrixD(young, poisson);
	
	// Bマトリクスを作成
	this.B = new Array(this.Tri.length);
	for(var i=0; i<this.Tri.length; i++){
		this.B[i] = this.makeMatrixB(this.Pos[this.Tri[i][0]], this.Pos[this.Tri[i][1]], this.Pos[this.Tri[i][2]]);
	}
	
	// Kマトリクスを作成
	var Ke, Bt, posMat, area;
	this.K = numeric.rep([2*this.Pos.length,2*this.Pos.length],0);
	for(var i=0; i<this.Tri.length; i++){
		// Bマトリクスを作成
		Bt = numeric.transpose(this.B[i]);
		KeTmp = numeric.dot(this.D,this.B[i]);
		KeTmp = numeric.dot(Bt,KeTmp);
		posMat =  [
		[1,this.Pos[this.Tri[i][0]][0],this.Pos[this.Tri[i][0]][1]], 
		[1,this.Pos[this.Tri[i][1]][0],this.Pos[this.Tri[i][1]][1]], 
		[1,this.Pos[this.Tri[i][2]][0],this.Pos[this.Tri[i][2]][1]] ];
		area = 0.5 * numeric.det(posMat);
		Ke = numeric.mul(KeTmp,area*thickness);
		// 全体剛性マトリクスの作成
		for(var j=0; j<3; j++)
			for(var k=0; k<3; k++)
				for(var l=0; l<2; l++)
					for(var m=0; m<2; m++)
						this.K[2*this.Tri[i][j]+l][2*this.Tri[i][k]+m] += Ke[2*j+l][2*k+m];
	}
}

// 境界条件の設定（周辺のすべてのノードを強制変位）
FEM.prototype.setBoudary = function(zfix, zdisp, disp){
	this.dlist = [];
	this.flist = [];
	this.ud = [];
	this.ff = [];
	
	var nodeToDF = numeric.linspace(0,0,this.Pos.length);
	this.u = numeric.linspace(0,0,2*this.Pos.length);
	this.f = numeric.linspace(0,0,2*this.Pos.length);
	

	// 底面のノードに強制変位を与える
	for(var i=0; i<this.Pos.length; i++){
		if(this.InitPos[i][1] == zfix){
			this.u[2*i] = 0;
			this.u[2*i+1] = 0;
			nodeToDF[i] = "d";
		}else if(this.InitPos[i][1] == zdisp){
			this.u[2*i] = disp[0];
			this.u[2*i+1] = disp[1];
			nodeToDF[i] = "d";
		}else{
			this.f[2*i] = 0;
			this.f[2*i+1] = 0;
			nodeToDF[i] = "f";
		}
	}
	
	for(var i=0; i<this.Pos.length; i++){
		if(nodeToDF[i] == "d"){
			this.dlist.push(i);
			this.ud.push(this.u[2*i]);
			this.ud.push(this.u[2*i+1]);
		}else{
			this.flist.push(i);
			this.ff.push(this.f[2*i]);
			this.ff.push(this.f[2*i+1]);
		}
	}
}



// 境界条件を設定して変形計算を行う
// 境界条件は y=0 を固定
FEM.prototype.calcDeformation = function(){
	
	var f = this.flist.length;
	var d = this.dlist.length;
	
	var Kff = numeric.rep([2*f,2*f],0);
	for(var i=0; i<f; i++)
		for(var j=0; j<f; j++)
			for(var k=0; k<2; k++)
				for(var l=0; l<2; l++)
					Kff[2*i+k][2*j+l] = this.K[2*this.flist[i]+k][2*this.flist[j]+l];
	
	var Kfd = numeric.rep([2*f,2*d],0);
	for(var i=0; i<f; i++)
		for(var j=0; j<d; j++)
			for(var k=0; k<2; k++)
				for(var l=0; l<2; l++)
					Kfd[2*i+k][2*j+l] = this.K[2*this.flist[i]+k][2*this.dlist[j]+l];
		
	var y = numeric.dot(Kfd,this.ud);
	y = numeric.neg(y);
	uf = numeric.solve(Kff,y);
	
	for(var i=0; i<f; i++){
		for(var j=0; j<2; j++){
			this.Pos[this.flist[i]][j] = this.InitPos[this.flist[i]][j] + uf[2*i+j];
			this.u[2*this.flist[i]+j] = uf[2*i+j];
		}
	}
	
	for(var i=0; i<d; i++)
		for(var j=0; j<2; j++)
			this.Pos[this.dlist[i]][j] = this.InitPos[this.dlist[i]][j] + this.ud[2*i+j];
}


// 応力テンソル場を求める
FEM.prototype.calcStress = function(){
	// 応力テンソル場
	var ue = [0,0,0,0,0,0];
	var strain = [0,0,0];
	for(var i=0; i<this.Tri.length; i++){
		for(var j=0; j<3; j++){
			ue[2*j] = this.u[2*this.Tri[i][j]];
			ue[2*j+1] = this.u[2*this.Tri[i][j]+1];
		}
		strain = numeric.dot(this.B[i],ue);
		this.Sigma[i] = numeric.dot(this.D,strain);
	}
	// 主応力・最大主応力
	var sx, sy, txy, s1, s2;
	for(var i=0; i<this.Tri.length; i++){
		sx = this.Sigma[i][0];
		sy = this.Sigma[i][1];
		txy = this.Sigma[i][2];
		this.alpha[i] = Math.atan2(2*txy,sx-sy)*0.5;
		s1 = (sx+sy)*0.5+Math.sqrt((sx-sy)*(sx-sy)+4*txy*txy)*0.5;
		s2 = (sx+sy)*0.5-Math.sqrt((sx-sy)*(sx-sy)+4*txy*txy)*0.5;
		if(Math.abs(s1)>Math.abs(s2)){
			this.maxPStress[i] = s1;
		}else{
			this.maxPStress[i] = s2;
		}
		this.PStress[i][0] = s1;
		this.PStress[i][1] = s2;
	}
}


	
// 三角形定ひずみ要素のBマトリクスを作成する関数
FEM.prototype.makeMatrixB = function(p1,p2,p3){
	var Be = [[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]];
	var mat = [[1,p1[0],p1[1]], [1,p2[0],p2[1]], [1,p3[0],p3[1]]];
	var delta = numeric.det(mat);
	var dd = 1.0/delta;
	Be[0][0] = (p2[1]-p3[1])*dd;
	Be[0][2] = (p3[1]-p1[1])*dd;
	Be[0][4] = (p1[1]-p2[1])*dd;
	Be[1][1] = (p3[0]-p2[0])*dd;
	Be[1][3] = (p1[0]-p3[0])*dd;
	Be[1][5] = (p2[0]-p1[0])*dd;
	Be[2][0] = (p3[0]-p2[0])*dd;
	Be[2][1] = (p2[1]-p3[1])*dd;
	Be[2][2] = (p1[0]-p3[0])*dd;
	Be[2][3] = (p3[1]-p1[1])*dd;
	Be[2][4] = (p2[0]-p1[0])*dd;
	Be[2][5] = (p1[1]-p2[1])*dd;
	return Be;
}


// 三角形定ひずみ要素の平面ひずみ場近似における
// Dマトリクスを作成する関数
FEM.prototype.makeMatrixD = function(young, poisson){
	var tmp = young / (1.0-poisson*poisson);
	var D = [[0,0,0],[0,0,0],[0,0,0]];
	D[0][0]=tmp;
	D[0][1]=poisson*tmp;
	D[1][0]=poisson*tmp;
	D[1][1]=tmp;
	D[2][2]=0.5*(1-poisson)*tmp;
	return D
}