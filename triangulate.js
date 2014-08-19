function Triangulate(options) {
    if (typeof options === 'undefined') options = {};

    function getDefault(_option, _default) {
        return (typeof _option !== 'undefined') ? _option : _default;
    }

    this.options = {
        format: getDefault(options.format, 'svg')
    };

}

Triangulate.Result = function(options, width, height, imageData) {
    /* Options */
    this.options = options;
    this.width = width;
    this.height = height;
    this.imageData = imageData;

    this.laplace_thresh = 30;
    this.eigen_thresh = 25;

    /* Objects */
    this.triangles = this.generateTriangles();
    this.svg = this.generateSVG();

    var serializer = new XMLSerializer();
    this.svgString = serializer.serializeToString(this.svg);


};

Triangulate.prototype.generate = function(width, height, imageData) {
    return new Triangulate.Result(this.options, width, height, imageData);
};

Triangulate.Result.prototype.getPoints = function() {
    var points = [];
    var i = this.width * this.height;
    while (--i >= 0) {
        points[i] = new jsfeat.point2d_t(0, 0, 0, 0);
    }


};

Triangulate.Result.prototype.generateTriangles = function() {
    var points = this.getPoints();
};

Triangulate.Result.prototype.generateSVG = function() {

};