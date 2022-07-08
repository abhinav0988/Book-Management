const bookModel = require("../models/bookModel")
const mongoose = require ("mongoose")

const moment = require("moment")
const userModel = require("../models/userModel")
const ReviewModel=require("../models/reviewModel")

const createBook = async function (req, res){
    try{
        let data = req.body
        if(Object.keys(data).length == 0) return res.status(400).send({status:false, msg : "Please input data!"})

        let {title, excerpt,userId,ISBN,category,subcategory,releasedAt} = data
        
        if(!title)return res.status(400).send({status : false, msg : "Please insert title!"})
        let uniqueTitle = await bookModel.findOne({title : title})
        if(uniqueTitle) return res.status(409).send({status : false, msg : "Title already exists!"})

    
        if(!excerpt) return res.status(400).send({status : false, msg : "Excerpt should be present!"})

        
        if(!userId) return res.status(400).send({status : false, msg : "UserId should be present!"})
        let isValidId = mongoose.Types.ObjectId.isValid(userId)
        if(!isValidId) return res.status(400).send({status : false, msg : "The userId provided is invalid!"})

        
        if(!ISBN) return res.status(400).send({status : false, msg : "Please provide an ISBN!"})
        let isbnRegex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/
        if(!isbnRegex.test(ISBN)){
            return res.status(400).send({status : false, msg : "Please provide a valid ISBN!"})

        }
        let uniqueISBN = await bookModel.findOne({ISBN : ISBN})
        if(uniqueISBN) return res.status(409).send({status : false, msg : "ISBN already exists!"})

        
        if(!category) return res.status(400).send({status : false, msg : "Please provide a category!"})

        
        if(!subcategory) return res.status(400).send({status : false, msg : "Please provide a subCategory!"})

        
        if(!releasedAt) return res.status(400).send({status : false, msg : "Please provide a release date!"})
        releasedAt = moment(releasedAt).format("YYYY-MM-DD")
        let isValidDateFormat = function (date) {
            let dateFormatRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/
            
            return dateFormatRegex.test(date)
        }
        if(!isValidDateFormat(releasedAt)) return res.status(400).send({status : false, msg : "Wrong date format!"})

        let bookCreated = await bookModel.create(data)
        if(!bookCreated) res.status(404).send({status : false, msg : "Book already exists!"})

        res.status(201).send({status : true, msg : "Book created successfully!", bookCreated})
    }catch(error){
        res.status(500).send({msg : error.message})
    }
}








const getBooks = async function (req, res){
    try {

        let query = req.query
        
    
        if (!query) {
          let allBook = await bookModel.find({ isDeleted: false }).sort("title")
          if (allBook.length == 0) return res.status(400).send({ status: false, message: "Book Not Found" })
          return res.status(200).send({ status: true, message: "Books List", data: allBook })
        }
    
        if (query.userId) {
          let id = query.userId
          let isValidId = mongoose.Types.ObjectId.isValid(id)
        if(!isValidId) return res.status(400).send({status : false, msg : "The userId provided is invalid!"})
          let user = await userModel.findById(id)
          if (!user) { return res.status(400).send({ status: false, msg: "No book of such user" }) }
        }
    
        if (query.category) {
          const category = query.category
          const book = await bookModel.find({ category: category })
          if (book.length ==0) { return res.status(400).send({ status: false, msg: "No book related to this category" }) }
        }
    
        if (query.subcategory) {
          const subcategory = query.subcategory
          const book = await bookModel.find({ subcategory: subcategory })
          if (book.length == 0) { return res.status(400).send({ status: false, msg: "No book related to this subcategory" }) }
        }
    
        let getAllBook = await bookModel.find(query).select({ _id: 1, title: 1, excerpt: 1, userId: 1, category: 1, releasedAt: 1, reviews: 1 }).sort("title")
    
        if (getAllBook.length == 0) return res.status(404).send({ status: false, message: "Book Not Found" })
    
        return res.status(200).send({ status: true, message: "Books List", data: getAllBook })
}catch(error){
    res.status(500).send({msg : error.message})
}
}





//GETTING BOOKS BY ID

const getBooksById = async function (req, res) {
    try {
      let bookId = req.params.bookId;
    
      let isValidbookID = mongoose.isValidObjectId(bookId);
      if (!isValidbookID) {
        return res
          .status(400)
          .send({ status: false, message: "Book Id is Not Valid" });
      }
  
      const book = await bookModel.find({
        _id: bookId,
        isDeleted: false,
      }).select({ __v: 0, ISBN: 0 }); //check id exist in book model
      if (!book)
        return res
          .status(404)
          .send({ status: false, message: "BookId do not exist" });
    
    const Review= await  ReviewModel.find({_id:bookId})
     
    if(Review){
        book.reviews=Review
    }
   return res
        .status(200)
        .send({ status: true, message: "Book Lists", data: book });
    } catch (err) {
      return res.status(500).send({ status: false, message: err.message });
    }
  };









//DELETE BOOKS
const deleteBooks = async function (req, res){
    try{
        let data = req.params.bookId
        let isValid = mongoose.Types.ObjectId.isValid(data)
        if (!isValid) return res.status(400).send({ status: false, msg: "enter valid bookId" })

        let alreadyDeleted = await bookModel.findOne({_id : data, isDeleted : true})
        if(alreadyDeleted) return res.status(403).send({status:false, msg:"This book has already been deleted!"})

        let update = await bookModel.findOneAndUpdate({_id : data}, {$set: {isDeleted:true}}, {new : true})

            if(!update) return res.status(404).send({status : false, msg : "No book with such bookId exists!"})

            res.status(200).send({status : true, msg : "Deletion successful!", update})


    }catch(error){
        res.status(500).send({msg : error.message})
    }
} 

module.exports.createBook = createBook
module.exports.getBooks = getBooks
module.exports.getBooksById = getBooksById
module.exports.deleteBooks = deleteBooks
